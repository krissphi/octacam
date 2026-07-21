/**
 * js/renderer.js
 * Centralized Canvas Rendering Loop & Visual Overlays Engine
 */

import { state } from './state.js';
import { getVideoElement } from './camera.js';
import { apply3dLutToImageData } from './lutParser.js';
import { applyChromaKey } from './chromaEngine.js';
import { updateAudioVisualizerUI } from './audio.js';

let mainCanvas = null;
let mainCtx = null;
let cachedCanvas = null;
let cachedCtx = null;
let offscreenCanvas = null;
let offscreenCtx = null;

let noiseCanvas = null;
let noiseCtx = null;

let animationFrameId = null;
let lastCameraUpdateTime = 0;
let lastMainCanvasDrawTime = 0;

export function initRendererModule(canvasEl) {
  mainCanvas = canvasEl;
  mainCtx = mainCanvas.getContext('2d', { willReadFrequently: true });
  
  cachedCanvas = document.createElement('canvas');
  cachedCtx = cachedCanvas.getContext('2d', { willReadFrequently: true });
  
  offscreenCanvas = document.createElement('canvas');
  offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
  
  createNoiseCanvas();
}

function createNoiseCanvas() {
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 200;
  noiseCanvas.height = 200;
  noiseCtx = noiseCanvas.getContext('2d');
  
  const imgData = noiseCtx.createImageData(200, 200);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const val = Math.floor(Math.random() * 255);
    imgData.data[i] = val;
    imgData.data[i+1] = val;
    imgData.data[i+2] = val;
    imgData.data[i+3] = 40;
  }
  noiseCtx.putImageData(imgData, 0, 0);
}

export function startRenderLoop() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  function renderLoop(timestamp) {
    animationFrameId = requestAnimationFrame(renderLoop);
    const video = getVideoElement();
    if (!video || video.readyState < 2) return;

    const cameraInterval = 1000 / state.targetFps;
    if (timestamp - lastCameraUpdateTime >= cameraInterval) {
      updateCachedCanvas(video);
      lastCameraUpdateTime = timestamp;
    }

    const mainInterval = 1000 / 60;
    if (timestamp - lastMainCanvasDrawTime >= mainInterval) {
      drawMainCanvas();
      updateAudioVisualizerUI();
      lastMainCanvasDrawTime = timestamp;
    }
  }

  animationFrameId = requestAnimationFrame(renderLoop);
}

function updateCachedCanvas(video) {
  let vw = video.videoWidth;
  let vh = video.videoHeight;
  if (!vw || !vh) return;
  
  let targetRatio = 16 / 9;
  if (state.aspectRatio === '4-3') targetRatio = 4 / 3;
  else if (state.aspectRatio === '1-1') targetRatio = 1 / 1;
  else if (state.aspectRatio === '9-16') targetRatio = 9 / 16;
  
  let sx = 0, sy = 0, sw = vw, sh = vh;
  const videoRatio = vw / vh;
  
  if (videoRatio > targetRatio) {
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / targetRatio;
    sy = (vh - sh) / 2;
  }
  
  const targetW = Math.round(sw);
  const targetH = Math.round(sh);
  
  if (cachedCanvas.width !== targetW || cachedCanvas.height !== targetH) {
    cachedCanvas.width = targetW;
    cachedCanvas.height = targetH;
  }
  
  cachedCtx.clearRect(0, 0, cachedCanvas.width, cachedCanvas.height);
  if (state.isMirrored) {
    cachedCtx.save();
    cachedCtx.translate(cachedCanvas.width, 0);
    cachedCtx.scale(-1, 1);
    cachedCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cachedCanvas.width, cachedCanvas.height);
    cachedCtx.restore();
  } else {
    cachedCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cachedCanvas.width, cachedCanvas.height);
  }

  if (state.chromaKey.enabled) {
    applyChromaKey(cachedCtx, cachedCanvas.width, cachedCanvas.height);
  }
}

function drawMainCanvas() {
  if (!cachedCanvas.width || !cachedCanvas.height || !mainCanvas) return;
  
  if (mainCanvas.width !== cachedCanvas.width || mainCanvas.height !== cachedCanvas.height) {
    mainCanvas.width = cachedCanvas.width;
    mainCanvas.height = cachedCanvas.height;
  }
  
  mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
  mainCtx.save();
  
  let filterStr = `brightness(${state.videoAdjustments.brightness}%) contrast(${state.videoAdjustments.contrast}%) saturate(${state.videoAdjustments.saturation}%)`;
  
  if (state.activeFilter === 'lofi') {
    filterStr += ' sepia(35%) contrast(110%) saturate(125%) hue-rotate(-10deg)';
  } else if (state.activeFilter === 'cinematic') {
    filterStr += ' contrast(125%) saturate(135%) sepia(18%) hue-rotate(-15deg)';
  } else if (state.activeFilter === 'monochrome') {
    filterStr += ' grayscale(100%) contrast(140%) brightness(105%)';
  } else if (state.activeFilter === 'vhs') {
    filterStr += ' contrast(110%) saturate(75%) sepia(8%)';
  }
  
  mainCtx.filter = filterStr;
  
  if (state.activeFilter === 'pixel') {
    const pixelSize = state.videoAdjustments.pixelSize;
    const smallW = Math.max(1, Math.floor(mainCanvas.width / pixelSize));
    const smallH = Math.max(1, Math.floor(mainCanvas.height / pixelSize));
    
    if (offscreenCanvas.width !== smallW || offscreenCanvas.height !== smallH) {
      offscreenCanvas.width = smallW;
      offscreenCanvas.height = smallH;
    }
    
    offscreenCtx.imageSmoothingEnabled = false;
    offscreenCtx.drawImage(cachedCanvas, 0, 0, smallW, smallH);
    
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.drawImage(offscreenCanvas, 0, 0, smallW, smallH, 0, 0, mainCanvas.width, mainCanvas.height);
  } else {
    mainCtx.drawImage(cachedCanvas, 0, 0);
  }
  
  mainCtx.restore();
  
  if (state.activeFilter === 'custom_lut') {
    const imgData = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
    apply3dLutToImageData(imgData);
    mainCtx.putImageData(imgData, 0, 0);
  }
  
  if (state.overlays.scanlines > 0) {
    mainCtx.fillStyle = `rgba(0, 0, 0, ${state.overlays.scanlines / 220})`;
    for (let y = 0; y < mainCanvas.height; y += 4) {
      mainCtx.fillRect(0, y, mainCanvas.width, 2);
    }
  }
  
  if (state.overlays.grain > 0 && noiseCanvas) {
    mainCtx.save();
    mainCtx.globalAlpha = state.overlays.grain / 350;
    const pat = mainCtx.createPattern(noiseCanvas, 'repeat');
    if (pat) {
      mainCtx.fillStyle = pat;
      mainCtx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
    }
    mainCtx.restore();
  }
  
  if (state.overlays.vignette > 0) {
    mainCtx.save();
    const grad = mainCtx.createRadialGradient(
      mainCanvas.width / 2, mainCanvas.height / 2, Math.min(mainCanvas.width, mainCanvas.height) * 0.3,
      mainCanvas.width / 2, mainCanvas.height / 2, Math.max(mainCanvas.width, mainCanvas.height) * 0.7
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${state.overlays.vignette / 100})`);
    mainCtx.fillStyle = grad;
    mainCtx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
    mainCtx.restore();
  }
  
  if (state.overlays.hud) {
    mainCtx.save();
    mainCtx.font = '14px "Share Tech Mono", monospace';
    mainCtx.shadowBlur = 4;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const isDotVisible = Math.floor(now.getTime() / 500) % 2 === 0;
    if (isDotVisible) {
      mainCtx.fillStyle = '#ef4444';
      mainCtx.shadowColor = 'rgba(239, 68, 68, 0.6)';
      mainCtx.beginPath();
      mainCtx.arc(30, 28, 5, 0, Math.PI * 2);
      mainCtx.fill();
    }
    
    mainCtx.fillStyle = '#00ff66';
    mainCtx.shadowColor = 'rgba(0, 255, 102, 0.6)';
    mainCtx.fillText('REC', 45, 33);

    mainCtx.fillStyle = 'rgba(0, 255, 102, 0.85)';
    mainCtx.font = '13px "Share Tech Mono", monospace';
    const watermarkText = '★ MADE WITH OCTACAM ★';
    const textWidth = mainCtx.measureText(watermarkText).width;
    mainCtx.fillText(watermarkText, (mainCanvas.width - textWidth) / 2, 33);

    mainCtx.fillText(`${state.targetFps} FPS`, mainCanvas.width - 95, 33);
    
    mainCtx.fillText(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`, 25, mainCanvas.height - 25);
    
    const barCount = 8;
    const activeBars = Math.ceil((state.audio.peakLevel / 100) * barCount);
    let vuStr = 'MIC [';
    for (let b = 0; b < barCount; b++) {
      vuStr += (b < activeBars) ? '|' : '.';
    }
    vuStr += ']';
    mainCtx.fillStyle = state.audio.peakLevel > 70 ? '#ef4444' : '#00ff66';
    mainCtx.fillText(vuStr, mainCanvas.width / 2 - 50, mainCanvas.height - 25);
    
    mainCtx.fillStyle = '#00ff66';
    mainCtx.fillText(`${mainCanvas.width} x ${mainCanvas.height}`, mainCanvas.width - 135, mainCanvas.height - 25);
    
    mainCtx.restore();
  }
}
