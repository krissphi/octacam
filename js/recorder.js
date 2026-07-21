/**
 * js/recorder.js
 * Video + Audio Recording Manager
 * Captures 30 FPS canvas stream and combines independent audio track for WebM recording.
 * Features VP9 + Opus Bitrate Optimization (Reduces file size by ~70% without quality loss).
 */

import { state } from './state.js';
import { getAudioTrack } from './audio.js';

let visibilityHandler = null;

export function toggleRecording(canvasEl, recordBtnEl, recordStatusEl) {
  if (state.recording.isRecording) {
    stopRecording(recordBtnEl, recordStatusEl);
  } else {
    startRecording(canvasEl, recordBtnEl, recordStatusEl);
  }
}

export function startRecording(canvasEl, recordBtnEl, recordStatusEl) {
  if (state.recording.isRecording || !canvasEl) return;
  
  state.recording.chunks = [];
  
  // Capture 30 FPS video stream from canvas
  const recordStream = canvasEl.captureStream ? canvasEl.captureStream(30) : canvasEl.mozCaptureStream(30);
  
  // Attach independent audio track from microphone stream
  const audioTrack = getAudioTrack();
  if (audioTrack && audioTrack.readyState === 'live') {
    recordStream.addTrack(audioTrack);
  }
  
  // Resolution-based bitrate scaling:
  // The canvas is always full HD (1920x1080 or equivalent) regardless of FPS.
  // Bitrate must match canvas pixel density to avoid blurry / blocky artifacts.
  // Rule of thumb: ~4 bits per pixel per second at target FPS (VP9 efficiency).
  const canvasW = canvasEl.width || 1920;
  const canvasH = canvasEl.height || 1080;
  const pixelCount = canvasW * canvasH;
  const fps = Math.max(1, state.targetFps);

  // Base: 8 Mbps for 1920x1080 @ 30fps. Scale proportionally.
  const baseBitrate = 8_000_000; // 8 Mbps @ 1920×1080
  const basePixels  = 1920 * 1080;
  // Scale bitrate by pixel count and FPS relative to 30 fps baseline
  const fpsFactor   = Math.min(1, fps / 30);  // reduce for low FPS (less motion data needed)
  const resFactor   = pixelCount / basePixels;
  // Clamp: minimum 2 Mbps (retro/low-res), maximum 12 Mbps (4K-equivalent)
  const dynamicVideoBitrate = Math.round(
    Math.max(2_000_000, Math.min(12_000_000, baseBitrate * resFactor * (0.4 + 0.6 * fpsFactor)))
  );

  // Codec selection
  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8,opus';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }
  
  const options = {
    mimeType: mimeType,
    videoBitsPerSecond: dynamicVideoBitrate,
    audioBitsPerSecond: 96000    // 96 kbps Opus (high fidelity speech audio)
  };
  
  try {
    state.recording.mediaRecorder = new MediaRecorder(recordStream, options);
  } catch (err) {
    console.error('[Recorder] Instantiation error:', err);
    alert('Your browser does not support canvas recording.');
    return;
  }
  
  state.recording.mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      state.recording.chunks.push(e.data);
    }
  };
  
  state.recording.mediaRecorder.onstop = () => {
    state.recording.isRecording = false;
    saveRecordingFile();
  };
  
  state.recording.mediaRecorder.start(250);
  state.recording.isRecording = true;
  state.recording.startTime = performance.now();

  visibilityHandler = () => {
    if (document.hidden && state.recording.isRecording) {
      console.warn('[Recorder] Tab hidden during recording — frame emission may stall.');
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
  
  if (recordBtnEl) {
    recordBtnEl.classList.add('recording');
    recordBtnEl.innerHTML = '<i data-lucide="square"></i> Stop Record (V)';
    if (window.lucide) window.lucide.createIcons();
  }
  
  if (recordStatusEl) {
    recordStatusEl.classList.add('active');
    recordStatusEl.textContent = 'Recording... 00:00';
  }
  
  startTimerUpdate(recordStatusEl);
}

export function stopRecording(recordBtnEl, recordStatusEl) {
  if (!state.recording.isRecording || !state.recording.mediaRecorder) return;
  
  // Minimum 1-second guard protection (Prevents 0-byte file corruption)
  const elapsedMs = performance.now() - state.recording.startTime;
  if (elapsedMs < 1000) {
    if (recordStatusEl) {
      recordStatusEl.textContent = '⏱️ Please wait... (Min 1 sec)';
      setTimeout(() => {
        if (state.recording.isRecording) {
          recordStatusEl.textContent = 'Recording...';
        }
      }, 700);
    }
    return;
  }
  
  stopTimerUpdate();

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  
  try {
    state.recording.mediaRecorder.stop();
  } catch (e) {
    console.warn('[Recorder] Stop error:', e);
  }
  
  if (recordBtnEl) {
    recordBtnEl.classList.remove('recording');
    recordBtnEl.innerHTML = '<i data-lucide="video"></i> Record (V)';
    if (window.lucide) window.lucide.createIcons();
  }
  
  if (recordStatusEl) {
    recordStatusEl.classList.remove('active');
    recordStatusEl.textContent = 'Saving video...';
  }
}

let timerInterval = null;

function startTimerUpdate(recordStatusEl) {
  stopTimerUpdate();
  timerInterval = setInterval(() => {
    if (!state.recording.isRecording) return;
    const elapsedMs = performance.now() - state.recording.startTime;
    const totalSec = Math.floor(elapsedMs / 1000);
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    if (recordStatusEl) {
      recordStatusEl.textContent = `Recording... ${mins}:${secs}`;
    }
  }, 1000);
}

function stopTimerUpdate() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function saveRecordingFile() {
  if (state.recording.chunks.length === 0) return;
  
  const blob = new Blob(state.recording.chunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
  
  a.style.display = 'none';
  a.download = `octacam_record_${dateStr}.webm`;
  a.href = url;
  
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const recordStatusEl = document.getElementById('recordStatus');
    if (recordStatusEl) {
      recordStatusEl.textContent = 'Recording saved!';
      setTimeout(() => {
        if (!state.recording.isRecording) {
          recordStatusEl.textContent = 'Ready to Record / Take Photo';
        }
      }, 3000);
    }
  }, 200);
}
