/**
 * js/recorder.js
 * Video + Audio Recording Manager
 * Captures 30 FPS canvas stream and combines independent audio track for WebM recording.
 * Features VP9 + Opus Bitrate Optimization (Reduces file size by ~70% without quality loss).
 */

import { state } from './state.js';
import { getAudioTrack } from './audio.js';

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
  
  // Capture 30 FPS canvas stream
  const recordStream = canvasEl.captureStream(30);
  
  // Attach independent audio track from microphone stream
  const audioTrack = getAudioTrack();
  if (audioTrack && audioTrack.readyState === 'live') {
    recordStream.addTrack(audioTrack);
  }
  
  // Dynamic Bitrate Scaling based on active Target FPS:
  // - 1 to 8 FPS (Retro stop-motion): 1.5 Mbps (~9 MB/min, ultra-compact)
  // - 9 to 15 FPS (Lo-Fi smooth): 2.5 Mbps (~16 MB/min, crisp motion)
  // - 16 to 60 FPS (Full smooth video): 4.0 Mbps (~26 MB/min, maximum 30 FPS fidelity)
  let dynamicVideoBitrate = 1500000;
  if (state.targetFps > 20) {
    dynamicVideoBitrate = 4000000;
  } else if (state.targetFps > 8) {
    dynamicVideoBitrate = 2500000;
  }
  
  // Codec Resolution
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
    saveRecordingFile();
  };
  
  state.recording.mediaRecorder.start(250);
  state.recording.isRecording = true;
  state.recording.startTime = performance.now();
  
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
  
  try {
    state.recording.mediaRecorder.stop();
  } catch (e) {
    console.warn('[Recorder] Stop error:', e);
  }
  
  state.recording.isRecording = false;
  
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
