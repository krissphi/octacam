/**
 * js/state.js
 * Centralized Application State Manager & localStorage Persistence Engine
 */

export const state = {
  targetFps: 8,
  currentCameraId: '',
  currentAudioId: 'default',
  aspectRatio: '16-9',
  activeFilter: 'none',
  isUiCollapsed: false,
  isMirrored: false,
  countdownSeconds: 0, // 0 for instant, 3 for 3-second countdown
  
  videoAdjustments: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    pixelSize: 4
  },
  
  overlays: {
    hud: true,
    scanlines: 0,
    grain: 0,
    vignette: 0,
    rounded: 16
  },

  chromaKey: {
    enabled: false,
    keyColor: '#00ff00',
    similarity: 40,
    smoothness: 10,
    bgType: 'transparent',
    bgImage: null
  },
  
  recording: {
    isRecording: false,
    startTime: 0,
    timerInterval: null,
    chunks: [],
    mediaRecorder: null
  },
  
  audio: {
    peakLevel: 0,
    isMuted: false,
    statusText: 'Silent',
    statusColor: 'var(--text-secondary)'
  },
  
  audioEnhancer: true,
  audioMonitor: false,
  audioMonitorVolume: 80,

  zoom: {
    enabled: false,
    factor: 2.5,
    active: false,
    targetX: 0.5,
    targetY: 0.5,
    currentFactor: 1.0,
    currentX: 0.5,
    currentY: 0.5
  },

  teleprompter: {
    enabled: false,
    isScrolling: false,
    speed: 3,
    fontSize: 24,
    opacity: 70,
    mirror: false,
    text: 'Welcome to OctaCam Teleprompter!\n\nType or paste your speech script here. Adjust the scroll speed, font size, and background transparency for your maximum comfort.\n\nKeep your eyes focused near the camera lens while reading to maintain excellent eye contact with your audience.'
  }
};

export function saveUserPreferences() {
  try {
    const prefs = {
      targetFps: state.targetFps,
      aspectRatio: state.aspectRatio,
      isMirrored: state.isMirrored,
      currentCameraId: state.currentCameraId,
      currentAudioId: state.currentAudioId,
      audioMonitor: state.audioMonitor,
      audioMonitorVolume: state.audioMonitorVolume,
      audioEnhancer: state.audioEnhancer,
      countdownSeconds: state.countdownSeconds,
      zoomEnabled: state.zoom.enabled,
      zoomFactor: state.zoom.factor,
      tpEnabled: state.teleprompter.enabled,
      tpSpeed: state.teleprompter.speed,
      tpFontSize: state.teleprompter.fontSize,
      tpOpacity: state.teleprompter.opacity,
      tpMirror: state.teleprompter.mirror,
      tpText: state.teleprompter.text
    };
    localStorage.setItem('octacam_user_settings', JSON.stringify(prefs));
  } catch (e) {
    console.warn('[State] Failed to save preferences to localStorage:', e);
  }
}

export function loadUserPreferences() {
  try {
    const data = localStorage.getItem('octacam_user_settings');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function resetState() {
  state.targetFps = 8;
  state.aspectRatio = '16-9';
  state.activeFilter = 'none';
  state.videoAdjustments.brightness = 100;
  state.videoAdjustments.contrast = 100;
  state.videoAdjustments.saturation = 100;
  state.videoAdjustments.pixelSize = 4;
  state.overlays.hud = true;
  state.overlays.scanlines = 0;
  state.overlays.grain = 0;
  state.overlays.vignette = 0;
  state.overlays.rounded = 16;
  state.countdownSeconds = 0;
  state.zoom.enabled = false;
  state.zoom.factor = 2.5;
  state.zoom.active = false;
  state.zoom.currentFactor = 1.0;
  state.teleprompter.enabled = false;
  state.teleprompter.isScrolling = false;
  state.teleprompter.speed = 3;
  state.teleprompter.fontSize = 24;
  state.teleprompter.opacity = 70;
  state.teleprompter.mirror = false;
  saveUserPreferences();
}
