/**
 * js/devices.js
 * Device Enumeration Helper for Video and Audio Inputs
 */

import { state } from './state.js';

export async function enumerateAllDevices(cameraSelectEl, audioSelectEl) {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // 1. Enumerate Cameras (videoinput)
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    if (cameraSelectEl) {
      cameraSelectEl.innerHTML = '';
      if (videoDevices.length === 0) {
        const opt = document.createElement('option');
        opt.text = 'No camera detected';
        cameraSelectEl.appendChild(opt);
      } else {
        videoDevices.forEach((device, index) => {
          const opt = document.createElement('option');
          opt.value = device.deviceId;
          opt.text = device.label || `Camera ${index + 1}`;
          cameraSelectEl.appendChild(opt);
        });
        
        if (state.currentCameraId && Array.from(cameraSelectEl.options).some(o => o.value === state.currentCameraId)) {
          cameraSelectEl.value = state.currentCameraId;
        } else if (cameraSelectEl.options.length > 0) {
          state.currentCameraId = cameraSelectEl.value;
        }
      }
    }
    
    // 2. Enumerate Microphones (audioinput)
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    if (audioSelectEl) {
      audioSelectEl.innerHTML = '';
      
      // Always include Default System Mic
      const defaultOpt = document.createElement('option');
      defaultOpt.value = 'default';
      defaultOpt.text = 'System Default Microphone';
      audioSelectEl.appendChild(defaultOpt);
      
      if (audioDevices.length > 0) {
        audioDevices.forEach((device, index) => {
          if (device.deviceId === 'default') return; // skip duplicate default
          const opt = document.createElement('option');
          opt.value = device.deviceId;
          opt.text = device.label || `Microphone ${index + 1}`;
          audioSelectEl.appendChild(opt);
        });
      }
      
      if (state.currentAudioId && Array.from(audioSelectEl.options).some(o => o.value === state.currentAudioId)) {
        audioSelectEl.value = state.currentAudioId;
      } else {
        audioSelectEl.value = state.currentAudioId || 'default';
      }
    }
    
    return { videoDevices, audioDevices };
  } catch (err) {
    console.error('[Devices] Enumeration error:', err);
    return { videoDevices: [], audioDevices: [] };
  }
}
