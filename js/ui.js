/**
 * js/ui.js
 * Master UI Event Controller & Preference Persistence Engine
 * Modular architecture importing uiPresets, uiChromaKey, uiHotkeys & screenShare.
 */

import { state, saveUserPreferences, loadUserPreferences } from './state.js';
import { startCameraStream } from './camera.js';
import { startAudioStream, ensureAudioContextResumed, updateAudioMonitorVolume, refreshAudioPipeline } from './audio.js';
import { enumerateAllDevices } from './devices.js';
import { triggerSnapshotFlow } from './snapshot.js';
import { toggleRecording } from './recorder.js';
import { uploadLutFile, loadSavedLutFromStorage } from './lutParser.js';

import { applyPreset, getUserPresetsFromStorage, saveUserPresetToStorage, renderUserPresetsInGrid } from './ui/uiPresets.js';
import { bindChromaKeyEvents } from './ui/uiChromaKey.js';
import { bindZoomEvents } from './ui/uiZoom.js';
import { bindHotkeyEvents } from './ui/uiHotkeys.js';
import { resetAllUi } from './ui/uiReset.js';

export function getUiElements() {
  return {
    cameraCanvas: document.getElementById('cameraCanvas'),
    canvasContainer: document.getElementById('canvasContainer'),
    viewportWrapper: document.getElementById('viewportWrapper'),
    appContainer: document.querySelector('.app-container'),
    controlSidebar: document.getElementById('controlSidebar'),
    cameraSelect: document.getElementById('cameraSelect'),
    cameraActiveInfo: document.getElementById('cameraActiveInfo'),
    audioSelect: document.getElementById('audioSelect'),
    audioActiveInfo: document.getElementById('audioActiveInfo'),
    refreshDevicesBtn: document.getElementById('refreshDevicesBtn'),
    fpsSlider: document.getElementById('fpsSlider'),
    brightnessSlider: document.getElementById('brightnessSlider'),
    contrastSlider: document.getElementById('contrastSlider'),
    saturationSlider: document.getElementById('saturationSlider'),
    pixelSizeSlider: document.getElementById('pixelSizeSlider'),
    toggleHud: document.getElementById('toggleHud'),
    scanlinesSlider: document.getElementById('scanlinesSlider'),
    grainSlider: document.getElementById('grainSlider'),
    vignetteSlider: document.getElementById('vignetteSlider'),
    roundedSlider: document.getElementById('roundedSlider'),
    snapshotBtn: document.getElementById('snapshotBtn'),
    recordBtn: document.getElementById('recordBtn'),
    recordStatus: document.getElementById('recordStatus'),
    errorScreen: document.getElementById('errorScreen'),
    retryCameraBtn: document.getElementById('retryCameraBtn'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    floatingToggleBtn: document.getElementById('floatingToggleBtn'),
    uploadLutBtn: document.getElementById('uploadLutBtn'),
    lutFileInput: document.getElementById('lutFileInput'),
    lutStatusInfo: document.getElementById('lutStatusInfo'),
    customLutPresetBtn: document.getElementById('customLutPresetBtn'),
    savePresetInput: document.getElementById('savePresetInput'),
    savePresetBtn: document.getElementById('savePresetBtn')
  };
}

export function initUiEventListeners(elements) {
  const {
    cameraSelect, cameraActiveInfo, audioSelect, audioActiveInfo,
    refreshDevicesBtn, fpsSlider, brightnessSlider, contrastSlider,
    saturationSlider, pixelSizeSlider, toggleHud, scanlinesSlider,
    grainSlider, vignetteSlider, roundedSlider, cameraCanvas,
    canvasContainer, recordBtn, recordStatus, retryCameraBtn,
    controlSidebar, closeSidebarBtn, floatingToggleBtn,
    uploadLutBtn, lutFileInput, lutStatusInfo, customLutPresetBtn,
    savePresetInput, savePresetBtn, appContainer
  } = elements;

  renderUserPresetsInGrid(elements);

  // Restore saved preferences from localStorage
  const savedPrefs = loadUserPreferences();
  if (savedPrefs) {
    if (savedPrefs.targetFps) setFps(savedPrefs.targetFps);
    if (savedPrefs.aspectRatio) setAspectRatio(savedPrefs.aspectRatio);
    if (typeof savedPrefs.isMirrored === 'boolean') {
      state.isMirrored = savedPrefs.isMirrored;
      const toggleMirror = document.getElementById('toggleMirror');
      if (toggleMirror) toggleMirror.checked = savedPrefs.isMirrored;
    }
    if (typeof savedPrefs.countdownSeconds === 'number') {
      state.countdownSeconds = savedPrefs.countdownSeconds;
      const photoTimerSelect = document.getElementById('photoTimerSelect');
      if (photoTimerSelect) photoTimerSelect.value = savedPrefs.countdownSeconds;
    }
    if (typeof savedPrefs.audioMonitorVolume === 'number') {
      state.audioMonitorVolume = savedPrefs.audioMonitorVolume;
      const slider = document.getElementById('monitorVolumeSlider');
      if (slider) slider.value = savedPrefs.audioMonitorVolume;
      const valEl = document.getElementById('monitorVolumeVal');
      if (valEl) valEl.textContent = `${savedPrefs.audioMonitorVolume}%`;
    }
    if (typeof savedPrefs.zoomEnabled === 'boolean') {
      state.zoom.enabled = savedPrefs.zoomEnabled;
      const toggleClickToZoom = document.getElementById('toggleClickToZoom');
      if (toggleClickToZoom) toggleClickToZoom.checked = savedPrefs.zoomEnabled;
      const zoomFactorWrapper = document.getElementById('zoomFactorWrapper');
      if (zoomFactorWrapper) zoomFactorWrapper.style.display = savedPrefs.zoomEnabled ? 'block' : 'none';
      if (elements.canvasContainer) {
        if (savedPrefs.zoomEnabled) elements.canvasContainer.classList.add('zoom-enabled');
        else elements.canvasContainer.classList.remove('zoom-enabled');
      }
    }
    if (typeof savedPrefs.zoomFactor === 'number') {
      state.zoom.factor = savedPrefs.zoomFactor;
      const slider = document.getElementById('zoomFactorSlider');
      if (slider) slider.value = savedPrefs.zoomFactor;
      const valEl = document.getElementById('zoomFactorVal');
      if (valEl) valEl.textContent = `${savedPrefs.zoomFactor.toFixed(1)}x`;
    }
  }

  bindZoomEvents();

  if (cameraSelect) {
    cameraSelect.addEventListener('change', () => {
      startCameraStream(cameraSelect.value, cameraActiveInfo, elements.errorScreen);
      saveUserPreferences();
    });
  }

  if (audioSelect) {
    audioSelect.addEventListener('change', () => {
      startAudioStream(audioSelect.value, audioActiveInfo);
      saveUserPreferences();
    });
    audioSelect.addEventListener('click', ensureAudioContextResumed);
    audioSelect.addEventListener('focus', ensureAudioContextResumed);
  }

  if (refreshDevicesBtn) {
    refreshDevicesBtn.addEventListener('click', async () => {
      refreshDevicesBtn.style.transform = 'rotate(360deg)';
      await enumerateAllDevices(cameraSelect, audioSelect);
      setTimeout(() => { refreshDevicesBtn.style.transform = 'none'; }, 300);
    });
  }



  const photoTimerSelect = document.getElementById('photoTimerSelect');
  if (photoTimerSelect) {
    photoTimerSelect.addEventListener('change', () => {
      state.countdownSeconds = parseInt(photoTimerSelect.value, 10);
      saveUserPreferences();
    });
  }

  const toggleAudioMonitor = document.getElementById('toggleAudioMonitor');
  const monitorVolumeSlider = document.getElementById('monitorVolumeSlider');

  if (toggleAudioMonitor) {
    toggleAudioMonitor.addEventListener('change', () => {
      state.audioMonitor = toggleAudioMonitor.checked;
      updateAudioMonitorVolume();
      const monitorVolumeWrapper = document.getElementById('monitorVolumeWrapper');
      if (monitorVolumeWrapper) {
        monitorVolumeWrapper.style.display = state.audioMonitor ? 'block' : 'none';
      }
      saveUserPreferences();
    });
  }

  if (monitorVolumeSlider) {
    monitorVolumeSlider.addEventListener('input', () => {
      state.audioMonitorVolume = parseInt(monitorVolumeSlider.value, 10);
      const valEl = document.getElementById('monitorVolumeVal');
      if (valEl) valEl.textContent = `${state.audioMonitorVolume}%`;
      updateAudioMonitorVolume();
      saveUserPreferences();
    });
  }

  const toggleAudioEnhancer = document.getElementById('toggleAudioEnhancer');
  if (toggleAudioEnhancer) {
    toggleAudioEnhancer.addEventListener('change', () => {
      state.audioEnhancer = toggleAudioEnhancer.checked;
      refreshAudioPipeline();
      saveUserPreferences();
    });
  }

  const toggleMirror = document.getElementById('toggleMirror');
  if (toggleMirror) {
    toggleMirror.addEventListener('change', () => {
      state.isMirrored = toggleMirror.checked;
      saveUserPreferences();
    });
  }

  bindChromaKeyEvents();

  if (retryCameraBtn) {
    retryCameraBtn.addEventListener('click', () => {
      startCameraStream(cameraSelect.value, cameraActiveInfo, elements.errorScreen);
    });
  }

  document.querySelectorAll('.fps-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setFps(parseInt(btn.getAttribute('data-fps')));
      saveUserPreferences();
    });
  });

  if (fpsSlider) {
    fpsSlider.addEventListener('input', () => {
      setFps(parseInt(fpsSlider.value));
      saveUserPreferences();
    });
  }

  function setFps(fps) {
    state.targetFps = fps;
    const valEl = document.getElementById('customFpsVal');
    if (valEl) valEl.textContent = `${fps} FPS`;
    if (fpsSlider) fpsSlider.value = fps;
    document.querySelectorAll('.fps-btn').forEach(b => {
      if (parseInt(b.getAttribute('data-fps')) === fps) b.classList.add('active');
      else b.classList.remove('active');
    });
  }

  document.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ratio = btn.getAttribute('data-ratio');
      setAspectRatio(ratio);
      saveUserPreferences();
    });
  });

  function setAspectRatio(ratio) {
    state.aspectRatio = ratio;
    if (elements.viewportWrapper) {
      elements.viewportWrapper.className = `viewport-wrapper ratio-${ratio}`;
    }
    document.querySelectorAll('.ratio-btn').forEach(b => {
      if (b.getAttribute('data-ratio') === ratio) b.classList.add('active');
      else b.classList.remove('active');
    });
  }

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const filterKey = btn.getAttribute('data-filter');
      if (filterKey) {
        applyPreset(filterKey, elements);
      }
    });
  });

  if (uploadLutBtn && lutFileInput) {
    uploadLutBtn.addEventListener('click', () => lutFileInput.click());
    lutFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (lutStatusInfo) {
        lutStatusInfo.textContent = 'Parsing .cube LUT file...';
        lutStatusInfo.style.color = '#06b6d4';
      }
      const success = await uploadLutFile(file);
      if (success) {
        if (lutStatusInfo) {
          lutStatusInfo.textContent = `✓ Active: ${file.name.slice(0, 20)}`;
          lutStatusInfo.style.color = '#00ff66';
        }
        if (customLutPresetBtn) {
          customLutPresetBtn.style.display = 'flex';
          applyPreset('custom_lut', elements);
        }
      } else {
        if (lutStatusInfo) {
          lutStatusInfo.textContent = 'Failed to parse .cube LUT file';
          lutStatusInfo.style.color = '#ef4444';
        }
      }
    });
  }

  if (loadSavedLutFromStorage() && customLutPresetBtn) {
    customLutPresetBtn.style.display = 'flex';
  }

  if (savePresetBtn && savePresetInput) {
    savePresetBtn.addEventListener('click', () => {
      const name = savePresetInput.value.trim();
      if (!name) return;
      const newPreset = {
        id: `user_preset_${Date.now()}`,
        name: name,
        brightness: state.videoAdjustments.brightness,
        contrast: state.videoAdjustments.contrast,
        saturation: state.videoAdjustments.saturation,
        pixelSize: state.videoAdjustments.pixelSize,
        scanlines: state.overlays.scanlines,
        grain: state.overlays.grain,
        vignette: state.overlays.vignette,
        rounded: state.overlays.rounded
      };
      saveUserPresetToStorage(newPreset);
      savePresetInput.value = '';
      renderUserPresetsInGrid(elements);
      // Use applyUserPresetObject so sliders reflect the saved values (not reset to Normal)
      import('./ui/uiPresets.js').then(({ applyUserPresetObject }) => {
        applyUserPresetObject(newPreset, elements, null);
      });
    });
  }

  if (brightnessSlider) {
    brightnessSlider.addEventListener('input', () => {
      state.videoAdjustments.brightness = parseFloat(brightnessSlider.value);
      document.getElementById('brightnessVal').textContent = `${brightnessSlider.value}%`;
    });
  }
  if (contrastSlider) {
    contrastSlider.addEventListener('input', () => {
      state.videoAdjustments.contrast = parseFloat(contrastSlider.value);
      document.getElementById('contrastVal').textContent = `${contrastSlider.value}%`;
    });
  }
  if (saturationSlider) {
    saturationSlider.addEventListener('input', () => {
      state.videoAdjustments.saturation = parseFloat(saturationSlider.value);
      document.getElementById('saturationVal').textContent = `${saturationSlider.value}%`;
    });
  }
  if (pixelSizeSlider) {
    pixelSizeSlider.addEventListener('input', () => {
      state.videoAdjustments.pixelSize = parseInt(pixelSizeSlider.value, 10);
      document.getElementById('pixelSizeVal').textContent = `${pixelSizeSlider.value}px`;
    });
  }

  if (toggleHud) {
    toggleHud.addEventListener('change', (e) => {
      state.overlays.hud = e.target.checked;
    });
  }
  if (scanlinesSlider) {
    scanlinesSlider.addEventListener('input', () => {
      state.overlays.scanlines = parseInt(scanlinesSlider.value);
      document.getElementById('scanlinesVal').textContent = `${scanlinesSlider.value}%`;
    });
  }
  if (grainSlider) {
    grainSlider.addEventListener('input', () => {
      state.overlays.grain = parseInt(grainSlider.value);
      document.getElementById('grainVal').textContent = `${grainSlider.value}%`;
    });
  }
  if (vignetteSlider) {
    vignetteSlider.addEventListener('input', () => {
      state.overlays.vignette = parseInt(vignetteSlider.value);
      document.getElementById('vignetteVal').textContent = `${vignetteSlider.value}%`;
    });
  }
  if (roundedSlider) {
    roundedSlider.addEventListener('input', () => {
      state.overlays.rounded = parseInt(roundedSlider.value);
      if (canvasContainer) canvasContainer.style.borderRadius = `${roundedSlider.value}px`;
      document.getElementById('roundedVal').textContent = `${roundedSlider.value}px`;
    });
  }

  if (elements.snapshotBtn) {
    elements.snapshotBtn.addEventListener('click', () => {
      triggerSnapshotFlow(cameraCanvas, canvasContainer, recordStatus);
    });
  }

  if (recordBtn) {
    recordBtn.addEventListener('click', () => {
      toggleRecording(cameraCanvas, recordBtn, recordStatus);
    });
  }

  function setUiCollapse(collapsed) {
    state.isUiCollapsed = collapsed;
    if (collapsed) {
      if (controlSidebar) controlSidebar.classList.add('collapsed');
      if (appContainer) appContainer.classList.add('ui-hidden');
      document.body.classList.add('stream-mode');
      if (floatingToggleBtn) floatingToggleBtn.style.display = 'flex';
    } else {
      if (controlSidebar) controlSidebar.classList.remove('collapsed');
      if (appContainer) appContainer.classList.remove('ui-hidden');
      document.body.classList.remove('stream-mode');
      if (floatingToggleBtn) floatingToggleBtn.style.display = 'none';
    }
  }

  if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => setUiCollapse(true));
  if (floatingToggleBtn) floatingToggleBtn.addEventListener('click', () => setUiCollapse(false));

  document.querySelectorAll('.section-header-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.collapsible-section');
      if (section) {
        const isCollapsed = section.classList.toggle('collapsed');
        btn.setAttribute('aria-expanded', (!isCollapsed).toString());
      }
    });
  });

  document.addEventListener('click', ensureAudioContextResumed);

  bindHotkeyEvents(elements, setFps, resetAllUi, setUiCollapse);
}
