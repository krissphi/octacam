/**
 * js/camera.js
 * Independent Camera Stream Manager (Video ONLY)
 * Does NOT touch audio tracks or refresh when mic changes.
 */

import { state } from './state.js';

let cameraStream = null;
let videoElement = null;

export function initCameraModule(videoEl) {
  videoElement = videoEl;
}

export function getCameraStream() {
  return cameraStream;
}

export function getVideoElement() {
  return videoElement;
}

export function stopCameraStream() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  if (videoElement) {
    videoElement.srcObject = null;
  }
}

export async function startCameraStream(deviceId, statusInfoEl, errorScreenEl) {
  stopCameraStream();
  
  if (errorScreenEl) errorScreenEl.classList.add('hidden');
  if (statusInfoEl) {
    statusInfoEl.textContent = 'Connecting camera...';
    statusInfoEl.style.color = '#06b6d4';
  }
  
  state.currentCameraId = deviceId || '';
  
  // Try strict exact deviceId constraint first so browser forces switching to the selected camera,
  // with fallback to ideal deviceId constraint if exact fails.
  const constraintsList = [];
  if (deviceId) {
    constraintsList.push({
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
    constraintsList.push({
      video: {
        deviceId: { ideal: deviceId },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
  } else {
    constraintsList.push({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
  }
  
  let successStream = null;
  let lastErr = null;
  for (const c of constraintsList) {
    try {
      successStream = await navigator.mediaDevices.getUserMedia(c);
      if (successStream && successStream.getVideoTracks().length > 0) {
        break;
      }
    } catch (err) {
      lastErr = err;
      console.warn('[Camera] getUserMedia constraint attempt failed:', c, err);
    }
  }
  
  if (!successStream) {
    console.error('[Camera] All getUserMedia constraints failed:', lastErr);
    if (statusInfoEl) {
      statusInfoEl.textContent = 'Camera Disconnected / Access Denied';
      statusInfoEl.style.color = '#ef4444';
    }
    if (errorScreenEl) errorScreenEl.classList.remove('hidden');
    throw lastErr || new Error('Failed to acquire camera stream');
  }
  
  cameraStream = successStream;
  if (videoElement) {
    videoElement.srcObject = cameraStream;
    await videoElement.play();
  }
  
  const activeTrack = cameraStream.getVideoTracks()[0];
  if (activeTrack) {
    const settings = activeTrack.getSettings();
    if (settings && settings.deviceId) {
      state.currentCameraId = settings.deviceId;
    }
  }
  
  if (statusInfoEl) {
    const label = activeTrack ? activeTrack.label : 'Camera Active';
    statusInfoEl.textContent = `Active: ${label || 'Camera Active'}`;
    statusInfoEl.style.color = '#00ff66';
  }
  return cameraStream;
}
