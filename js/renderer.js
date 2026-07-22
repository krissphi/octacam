/**
 * js/renderer.js
 * Centralized Canvas Rendering Loop & Visual Overlays Engine
 * GPU Pipeline: mainCtx has NO willReadFrequently (stays in GPU VRAM).
 * cachedCtx has willReadFrequently (CPU pixel access for chroma key / LUT).
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

// Overlay pattern caches — created once, reused every frame
let noiseCanvas = null;
let noisePattern = null;
let scanlinePatternCanvas = null;
let scanlinePattern = null;

// Vignette: pre-baked into an offscreen canvas, only rebuilt when value/size changes
let vignetteCanvas = null;
let vignetteCtx = null;
let vignetteLastValue = -1;
let vignetteLastW = 0;
let vignetteLastH = 0;

let animationFrameId = null;
let lastCameraUpdateTime = 0;
let lastMainCanvasDrawTime = 0;

// HUD date string cached per-second — avoids 3,600 Date allocations/minute
let _hudDateStr = '';
let _hudLastSecond = -1;
let _hudLastDotState = false;

export function initRendererModule(canvasEl) {
  mainCanvas = canvasEl;
  // NO willReadFrequently — keeps mainCanvas in GPU VRAM for hardware-accelerated blitting
  mainCtx = mainCanvas.getContext('2d');

  // cachedCtx needs willReadFrequently — getImageData for chroma key & 3D LUT
  cachedCanvas = document.createElement('canvas');
  cachedCtx = cachedCanvas.getContext('2d', { willReadFrequently: true });

  // offscreenCanvas for pixel-art filter (tiny canvas, no frequent reads)
  offscreenCanvas = document.createElement('canvas');
  offscreenCtx = offscreenCanvas.getContext('2d');

  // Vignette pre-bake offscreen canvas
  vignetteCanvas = document.createElement('canvas');
  vignetteCtx = vignetteCanvas.getContext('2d');

  createNoiseCanvas();
  createScanlinePattern();
}

function createScanlinePattern() {
  scanlinePatternCanvas = document.createElement('canvas');
  scanlinePatternCanvas.width = 4;
  scanlinePatternCanvas.height = 4;
  const sctx = scanlinePatternCanvas.getContext('2d');
  sctx.fillStyle = '#000000';
  sctx.fillRect(0, 0, 4, 2);
  scanlinePattern = null; // lazy-init on first use
}

function createNoiseCanvas() {
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 200;
  noiseCanvas.height = 200;
  const noiseCtx = noiseCanvas.getContext('2d');
  const imgData = noiseCtx.createImageData(200, 200);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const val = Math.floor(Math.random() * 255);
    imgData.data[i] = val;
    imgData.data[i + 1] = val;
    imgData.data[i + 2] = val;
    imgData.data[i + 3] = 40;
  }
  noiseCtx.putImageData(imgData, 0, 0);
  noisePattern = null; // lazy-init on first use
}

/**
 * Pre-bakes vignette gradient into an offscreen canvas.
 * Only rebuilds when vignette strength or canvas dimensions change.
 */
function ensureVignetteCanvas(w, h, vigVal) {
  if (vignetteLastValue === vigVal && vignetteLastW === w && vignetteLastH === h) return;
  vignetteCanvas.width = w;
  vignetteCanvas.height = h;
  const grad = vignetteCtx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.3,
    w / 2, h / 2, Math.max(w, h) * 0.7
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${vigVal / 100})`);
  vignetteCtx.fillStyle = grad;
  vignetteCtx.fillRect(0, 0, w, h);
  vignetteLastValue = vigVal;
  vignetteLastW = w;
  vignetteLastH = h;
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
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  let targetRatio = 16 / 9;
  if (state.aspectRatio === '4-3')       targetRatio = 4 / 3;
  else if (state.aspectRatio === '1-1')  targetRatio = 1;
  else if (state.aspectRatio === '9-16') targetRatio = 9 / 16;

  let sx = 0, sy = 0, sw = vw, sh = vh;
  const videoRatio = vw / vh;
  if (videoRatio > targetRatio) { sw = vh * targetRatio; sx = (vw - sw) / 2; }
  else                          { sh = vw / targetRatio; sy = (vh - sh) / 2; }

  // HD base for CPU processing (chroma key / LUT pixel ops run at this size)
  let targetW = 1280, targetH = 720;
  if (state.aspectRatio === '4-3')       { targetW = 960;  targetH = 720;  }
  else if (state.aspectRatio === '1-1')  { targetW = 720;  targetH = 720;  }
  else if (state.aspectRatio === '9-16') { targetW = 720;  targetH = 1280; }

  if (cachedCanvas.width !== targetW || cachedCanvas.height !== targetH) {
    cachedCanvas.width = targetW;
    cachedCanvas.height = targetH;
  }

  cachedCtx.clearRect(0, 0, targetW, targetH);

  // CSS filters applied ONLY on cachedCtx (CPU canvas), not on mainCtx
  let filterStr = `brightness(${state.videoAdjustments.brightness}%) contrast(${state.videoAdjustments.contrast}%) saturate(${state.videoAdjustments.saturation}%)`;
  if      (state.activeFilter === 'lofi')       filterStr += ' sepia(35%) contrast(110%) saturate(125%) hue-rotate(-10deg)';
  else if (state.activeFilter === 'cinematic')  filterStr += ' contrast(125%) saturate(135%) sepia(18%) hue-rotate(-15deg)';
  else if (state.activeFilter === 'monochrome') filterStr += ' grayscale(100%) contrast(140%) brightness(105%)';
  else if (state.activeFilter === 'vhs')        filterStr += ' contrast(110%) saturate(75%) sepia(8%)';

  cachedCtx.filter = filterStr;

  if (state.isMirrored) {
    cachedCtx.save();
    cachedCtx.translate(targetW, 0);
    cachedCtx.scale(-1, 1);
    cachedCtx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
    cachedCtx.restore();
  } else {
    cachedCtx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
  }

  cachedCtx.filter = 'none';

  if (state.chromaKey.enabled) {
    applyChromaKey(cachedCtx, targetW, targetH);
  }

  if (state.activeFilter === 'custom_lut') {
    const imgData = cachedCtx.getImageData(0, 0, targetW, targetH);
    apply3dLutToImageData(imgData);
    cachedCtx.putImageData(imgData, 0, 0);
  }
}

function drawMainCanvas() {
  if (!cachedCanvas.width || !cachedCanvas.height || !mainCanvas) return;

  let mainW = 1920, mainH = 1080;
  if (state.aspectRatio === '4-3')       { mainW = 1440; mainH = 1080; }
  else if (state.aspectRatio === '1-1')  { mainW = 1080; mainH = 1080; }
  else if (state.aspectRatio === '9-16') { mainW = 1080; mainH = 1920; }

  // Lock dimensions during recording to prevent VP9 encoder green-screen corruption.
  // The user CAN change aspect ratio during recording — we letterbox the new ratio
  // into the locked canvas so the encoder always sees the same frame dimensions.
  if (!state.recording.isRecording) {
    if (mainCanvas.width !== mainW || mainCanvas.height !== mainH) {
      mainCanvas.width = mainW;
      mainCanvas.height = mainH;
      // Invalidate cached overlay patterns — canvas resize clears the 2D context state
      scanlinePattern = null;
      noisePattern = null;
      vignetteLastValue = -1;
    }
  }

  const W = mainCanvas.width;
  const H = mainCanvas.height;

  mainCtx.clearRect(0, 0, W, H);

  // --- 60 FPS Click-to-Zoom GPU Lerp Engine ---
  const targetZoomFactor = (state.zoom.enabled && state.zoom.active) ? state.zoom.factor : 1.0;
  state.zoom.currentFactor += (targetZoomFactor - state.zoom.currentFactor) * 0.22;
  state.zoom.currentX += (state.zoom.targetX - state.zoom.currentX) * 0.22;
  state.zoom.currentY += (state.zoom.targetY - state.zoom.currentY) * 0.22;

  if (!state.zoom.active && state.zoom.currentFactor < 1.002) {
    state.zoom.currentFactor = 1.0;
  }

  const cW = cachedCanvas.width;
  const cH = cachedCanvas.height;

  let srcX = 0;
  let srcY = 0;
  let srcW = cW;
  let srcH = cH;

  if (state.zoom.currentFactor > 1.001) {
    const factor = state.zoom.currentFactor;
    const cropW = cW / factor;
    const cropH = cH / factor;
    const centerX = state.zoom.currentX * cW;
    const centerY = state.zoom.currentY * cH;

    srcX = Math.max(0, Math.min(cW - cropW, centerX - cropW / 2));
    srcY = Math.max(0, Math.min(cH - cropH, centerY - cropH / 2));
    srcW = cropW;
    srcH = cropH;
  }

  // Compute destination rect that fits cW/cH inside W/H, centered
  const scale = Math.min(W / cW, H / cH);
  const dstW  = Math.round(cW * scale);
  const dstH  = Math.round(cH * scale);
  const dstX  = Math.round((W - dstW) / 2);
  const dstY  = Math.round((H - dstH) / 2);

  if (state.activeFilter === 'pixel') {
    const pixelSize = state.videoAdjustments.pixelSize;
    const smallW = Math.max(1, Math.floor(dstW / pixelSize));
    const smallH = Math.max(1, Math.floor(dstH / pixelSize));
    if (offscreenCanvas.width !== smallW || offscreenCanvas.height !== smallH) {
      offscreenCanvas.width = smallW;
      offscreenCanvas.height = smallH;
    }
    offscreenCtx.imageSmoothingEnabled = false;
    offscreenCtx.drawImage(cachedCanvas, srcX, srcY, srcW, srcH, 0, 0, smallW, smallH);
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.drawImage(offscreenCanvas, 0, 0, smallW, smallH, dstX, dstY, dstW, dstH);
  } else {
    mainCtx.imageSmoothingEnabled = true;
    mainCtx.drawImage(cachedCanvas, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
  }

  // --- Scanlines: single GPU pattern fill, 0 per-frame rebuild cost ---
  if (state.overlays.scanlines > 0 && scanlinePatternCanvas) {
    if (!scanlinePattern) {
      scanlinePattern = mainCtx.createPattern(scanlinePatternCanvas, 'repeat');
    }
    if (scanlinePattern) {
      mainCtx.save();
      mainCtx.globalAlpha = state.overlays.scanlines / 220;
      mainCtx.fillStyle = scanlinePattern;
      mainCtx.fillRect(0, 0, W, H);
      mainCtx.restore();
    }
  }

  // --- Film grain: single GPU pattern fill, 0 per-frame rebuild cost ---
  if (state.overlays.grain > 0 && noiseCanvas) {
    if (!noisePattern) {
      noisePattern = mainCtx.createPattern(noiseCanvas, 'repeat');
    }
    if (noisePattern) {
      mainCtx.save();
      mainCtx.globalAlpha = state.overlays.grain / 350;
      mainCtx.fillStyle = noisePattern;
      mainCtx.fillRect(0, 0, W, H);
      mainCtx.restore();
    }
  }

  // --- Vignette: pre-baked offscreen canvas, single drawImage per frame ---
  if (state.overlays.vignette > 0) {
    ensureVignetteCanvas(W, H, state.overlays.vignette);
    mainCtx.drawImage(vignetteCanvas, 0, 0);
  }

  // --- HUD overlay ---
  if (state.overlays.hud) {
    drawHud(W, H);
  }
}

function drawHud(W, H) {
  mainCtx.save();
  mainCtx.shadowBlur = 4;

  // Cache date string — only rebuild once per second, not 60x/sec
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  if (nowSec !== _hudLastSecond) {
    const d = new Date(nowMs);
    const pad = (n) => String(n).padStart(2, '0');
    _hudDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    _hudLastSecond = nowSec;
  }
  const isDotVisible = Math.floor(nowMs / 500) % 2 === 0;
  if (isDotVisible) {
    mainCtx.fillStyle = '#ef4444';
    mainCtx.shadowColor = 'rgba(239, 68, 68, 0.6)';
    mainCtx.beginPath();
    mainCtx.arc(30, 28, 5, 0, Math.PI * 2);
    mainCtx.fill();
  }

  mainCtx.font = '14px "Share Tech Mono", monospace';
  mainCtx.fillStyle = '#00ff66';
  mainCtx.shadowColor = 'rgba(0, 255, 102, 0.6)';
  mainCtx.fillText('REC', 45, 33);

  mainCtx.fillStyle = 'rgba(0, 255, 102, 0.85)';
  mainCtx.font = '13px "Share Tech Mono", monospace';
  const watermarkText = '\u2605 MADE WITH OCTACAM \u2605';
  const textWidth = mainCtx.measureText(watermarkText).width;
  mainCtx.fillText(watermarkText, (W - textWidth) / 2, 33);
  mainCtx.fillText(`${state.targetFps} FPS`, W - 95, 33);
  mainCtx.fillText(_hudDateStr, 25, H - 25);

  const barCount = 8;
  const activeBars = Math.ceil((state.audio.peakLevel / 100) * barCount);
  let vuStr = 'MIC [';
  for (let b = 0; b < barCount; b++) vuStr += (b < activeBars) ? '|' : '.';
  vuStr += ']';
  mainCtx.fillStyle = state.audio.peakLevel > 70 ? '#ef4444' : '#00ff66';
  mainCtx.fillText(vuStr, W / 2 - 50, H - 25);

  mainCtx.fillStyle = '#00ff66';
  mainCtx.fillText(`${W} x ${H}`, W - 135, H - 25);

  mainCtx.restore();
}
