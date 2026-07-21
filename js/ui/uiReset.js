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

  saveUserPreferences();
}
