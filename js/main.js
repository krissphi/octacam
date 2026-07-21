/**
 * js/main.js
 * Application Entry Point (Modular Clean Architecture)
 */

import { state } from './state.js';
import { enumerateAllDevices } from './devices.js';
import { initCameraModule, startCameraStream } from './camera.js';
import { startAudioStream } from './audio.js';
import { initRendererModule, startRenderLoop } from './renderer.js';
import { initUiEventListeners } from './ui.js';

window.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements map
  const elements = {
    webcamVideo: document.getElementById('webcamVideo'),
    cameraCanvas: document.getElementById('cameraCanvas'),
    canvasContainer: document.getElementById('canvasContainer'),
    viewportWrapper: document.getElementById('viewportWrapper'),
    cameraSelect: document.getElementById('cameraSelect'),
    cameraActiveInfo: document.getElementById('cameraActiveInfo'),
    audioSelect: document.getElementById('audioSelect'),
    audioActiveInfo: document.getElementById('audioActiveInfo'),
    refreshDevicesBtn: document.getElementById('refreshDevicesBtn'),
    retryCameraBtn: document.getElementById('retryCameraBtn'),
    fpsSlider: document.getElementById('fpsSlider'),
    brightnessSlider: document.getElementById('brightnessSlider'),
    contrastSlider: document.getElementById('contrastSlider'),
    saturationSlider: document.getElementById('saturationSlider'),
    pixelSizeSlider: document.getElementById('pixelSizeSlider'),
    scanlinesSlider: document.getElementById('scanlinesSlider'),
    grainSlider: document.getElementById('grainSlider'),
    vignetteSlider: document.getElementById('vignetteSlider'),
    roundedSlider: document.getElementById('roundedSlider'),
    toggleHud: document.getElementById('toggleHud'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    floatingToggleBtn: document.getElementById('floatingToggleBtn'),
    snapshotBtn: document.getElementById('snapshotBtn'),
    recordBtn: document.getElementById('recordBtn'),
    recordStatus: document.getElementById('recordStatus'),
    controlSidebar: document.getElementById('controlSidebar'),
    appContainer: document.querySelector('.app-container'),
    errorScreen: document.getElementById('errorScreen')
  };

  // Initialize Modules
  initCameraModule(elements.webcamVideo);
  initRendererModule(elements.cameraCanvas);
  initUiEventListeners(elements);
  
  if (window.lucide) window.lucide.createIcons();

  // Initial Permission Request & Stream Bootstrapping
  try {
    if (elements.cameraActiveInfo) elements.cameraActiveInfo.textContent = 'Meminta izin kamera...';
    if (elements.audioActiveInfo) elements.audioActiveInfo.textContent = 'Meminta izin mikrofon...';
    
    // 1. Start Camera Stream first (triggers camera permission prompt)
    await startCameraStream('', elements.cameraActiveInfo, elements.errorScreen);
    
    // 2. Start Audio Stream (triggers microphone permission prompt if needed)
    await startAudioStream('default', elements.audioActiveInfo);
    
    // 3. Populate devices AFTER permissions are granted to get real hardware labels
    await enumerateAllDevices(elements.cameraSelect, elements.audioSelect);
    
    // Start Canvas Render Engine
    startRenderLoop();
  } catch (err) {
    console.error('[Main] Bootstrapping error:', err);
  }

  // Handle hardware device plug/unplug events dynamically (Auto-Reconnect USB Webcam)
  if (navigator.mediaDevices) {
    navigator.mediaDevices.ondevicechange = async () => {
      console.log('[Hardware] USB Device change detected. Re-scanning & reconnecting...');
      await enumerateAllDevices(elements.cameraSelect, elements.audioSelect);
      if (elements.cameraSelect.value) {
        try {
          await startCameraStream(elements.cameraSelect.value, elements.cameraActiveInfo, elements.errorScreen);
        } catch (e) {
          console.warn('[Hardware] Auto-reconnect camera failed:', e);
        }
      }
    };
  }
});
