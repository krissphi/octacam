/**
 * js/ui/uiReset.js
 * Master UI Reset Controller
 */

import { state, saveUserPreferences } from '../state.js';
import { applyPreset } from './uiPresets.js';

export function resetAllUi(elements) {
  applyPreset('none', elements);
  state.targetFps = 8;
  const valEl = document.getElementById('customFpsVal');
  if (valEl) valEl.textContent = '8 FPS';
  if (elements.fpsSlider) elements.fpsSlider.value = 8;
  document.querySelectorAll('.fps-btn').forEach(b => {
    if (parseInt(b.getAttribute('data-fps')) === 8) b.classList.add('active');
    else b.classList.remove('active');
  });

  state.aspectRatio = '16-9';
  if (elements.viewportWrapper) elements.viewportWrapper.className = 'viewport-wrapper ratio-16-9';
  document.querySelectorAll('.ratio-btn').forEach(b => {
    if (b.getAttribute('data-ratio') === '16-9') b.classList.add('active');
    else b.classList.remove('active');
  });

  state.isMirrored = false;
  const toggleMirrorEl = document.getElementById('toggleMirror');
  if (toggleMirrorEl) toggleMirrorEl.checked = false;

  state.audioEnhancer = true;
  const toggleAudioEnhancerEl = document.getElementById('toggleAudioEnhancer');
  if (toggleAudioEnhancerEl) toggleAudioEnhancerEl.checked = true;

  state.chromaKey.enabled = false;
  state.chromaKey.keyColor = '#00ff00';
  state.chromaKey.similarity = 40;
  state.chromaKey.smoothness = 10;
  state.chromaKey.bgType = 'transparent';
  state.chromaKey.bgImage = null;
  const toggleChromaKeyEl = document.getElementById('toggleChromaKey');
  if (toggleChromaKeyEl) toggleChromaKeyEl.checked = false;
  const chromaKeyControls = document.getElementById('chromaKeyControls');
  if (chromaKeyControls) chromaKeyControls.style.display = 'none';
  // Sync color picker and bg type select to reset values
  const chromaColorInputEl = document.getElementById('chromaColorInput');
  if (chromaColorInputEl) chromaColorInputEl.value = '#00ff00';
  const chromaBgTypeSelectEl = document.getElementById('chromaBgTypeSelect');
  if (chromaBgTypeSelectEl) chromaBgTypeSelectEl.value = 'transparent';
  const chromaBgPresetWrapper = document.getElementById('chromaBgPresetWrapper');
  if (chromaBgPresetWrapper) chromaBgPresetWrapper.style.display = 'none';
  const chromaBgImageWrapper = document.getElementById('chromaBgImageWrapper');
  if (chromaBgImageWrapper) chromaBgImageWrapper.style.display = 'none';
  const chromaBgColorWrapper = document.getElementById('chromaBgColorWrapper');
  if (chromaBgColorWrapper) chromaBgColorWrapper.style.display = 'none';
  const chromaBgColorPicker = document.getElementById('chromaBgColorPicker');
  if (chromaBgColorPicker) chromaBgColorPicker.value = '#000000';
  const chromaBgColorVal = document.getElementById('chromaBgColorVal');
  if (chromaBgColorVal) chromaBgColorVal.textContent = '#000000';
  document.querySelectorAll('.bg-preset-btn').forEach(b => b.classList.remove('active'));

  state.audioMonitor = false;
  state.audioMonitorVolume = 80;
  const toggleAudioMonitorEl = document.getElementById('toggleAudioMonitor');
  if (toggleAudioMonitorEl) toggleAudioMonitorEl.checked = false;
  const monitorVolumeWrapper = document.getElementById('monitorVolumeWrapper');
  if (monitorVolumeWrapper) monitorVolumeWrapper.style.display = 'none';
  const monitorVolumeSlider = document.getElementById('monitorVolumeSlider');
  if (monitorVolumeSlider) monitorVolumeSlider.value = 80;
  const monitorVolumeVal = document.getElementById('monitorVolumeVal');
  if (monitorVolumeVal) monitorVolumeVal.textContent = '80%';

  state.countdownSeconds = 0;
  const photoTimerSelect = document.getElementById('photoTimerSelect');
  if (photoTimerSelect) photoTimerSelect.value = 0;

  state.zoom.enabled = false;
  state.zoom.factor = 2.5;
  state.zoom.active = false;
  state.zoom.currentFactor = 1.0;
  const toggleClickToZoomEl = document.getElementById('toggleClickToZoom');
  if (toggleClickToZoomEl) toggleClickToZoomEl.checked = false;
  const zoomFactorWrapper = document.getElementById('zoomFactorWrapper');
  if (zoomFactorWrapper) zoomFactorWrapper.style.display = 'none';
  const zoomFactorSlider = document.getElementById('zoomFactorSlider');
  if (zoomFactorSlider) zoomFactorSlider.value = 2.5;
  const zoomFactorVal = document.getElementById('zoomFactorVal');
  if (zoomFactorVal) zoomFactorVal.textContent = '2.5x';
  if (elements.canvasContainer) {
    elements.canvasContainer.classList.remove('zoom-enabled');
    elements.canvasContainer.classList.remove('zoom-active');
  }

  state.teleprompter.enabled = false;
  state.teleprompter.isScrolling = false;
  state.teleprompter.speed = 3;
  state.teleprompter.fontSize = 24;
  state.teleprompter.opacity = 70;
  state.teleprompter.mirror = false;

  const toggleTeleprompterEl = document.getElementById('toggleTeleprompter');
  if (toggleTeleprompterEl) toggleTeleprompterEl.checked = false;
  const teleprompterControlsWrapper = document.getElementById('teleprompterControlsWrapper');
  if (teleprompterControlsWrapper) teleprompterControlsWrapper.style.display = 'none';
  const teleprompterOverlay = document.getElementById('teleprompterOverlay');
  if (teleprompterOverlay) teleprompterOverlay.classList.add('hidden');
  const tpSpeedSlider = document.getElementById('tpSpeedSlider');
  if (tpSpeedSlider) tpSpeedSlider.value = 3;
  const tpSpeedVal = document.getElementById('tpSpeedVal');
  if (tpSpeedVal) tpSpeedVal.textContent = '3';
  const tpFontSizeSlider = document.getElementById('tpFontSizeSlider');
  if (tpFontSizeSlider) tpFontSizeSlider.value = 24;
  const tpFontSizeVal = document.getElementById('tpFontSizeVal');
  if (tpFontSizeVal) tpFontSizeVal.textContent = '24px';
  const tpOpacitySlider = document.getElementById('tpOpacitySlider');
  if (tpOpacitySlider) tpOpacitySlider.value = 70;
  const tpOpacityVal = document.getElementById('tpOpacityVal');
  if (tpOpacityVal) tpOpacityVal.textContent = '70%';
  const toggleTpMirror = document.getElementById('toggleTpMirror');
  if (toggleTpMirror) toggleTpMirror.checked = false;

  saveUserPreferences();
}
