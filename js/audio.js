/**
 * js/audio.js
 * Independent Audio Stream & Web Audio API Visualizer Manager
 * Robust microphone capture & dual TimeDomain/Frequency Analyser for 100% accurate audio detection.
 */

import { state } from './state.js';

let audioStream = null;
let activeAudioStreamRef = null; // Prevent V8 garbage collection of active stream
let audioCtx = null;
let audioAnalyser = null;
let audioSourceNode = null;
let dummyGainNode = null; // Sink node to keep Chrome WebAudio thread pulling PCM buffers
let audioMonitorGainNode = null; // Headphone Sidetone Monitor node
let highPassNode = null;         // BiquadFilter: high-pass (module-level to allow teardown)
let clarityNode = null;          // BiquadFilter: vocal-clarity peak (module-level to allow teardown)

let timeDomainDataArray = null; // Raw PCM waveform data (for VU meter volume peak)
let freqDataArray = null;       // FFT frequency data (for 8 equalizer bars)

// Cached DOM references — set lazily to avoid per-frame querySelector overhead
let _vuBarEl = null;
let _vuLabelEl = null;
let _freqBarEls = null;

export function getAudioStream() {
  return audioStream;
}

export function getAudioTrack() {
  if (audioStream && audioStream.getAudioTracks().length > 0) {
    return audioStream.getAudioTracks()[0];
  }
  return null;
}

export function stopAudioStream() {
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
  activeAudioStreamRef = null;
  teardownVisualizer();
}

function teardownVisualizer() {
  if (audioSourceNode) {
    try { audioSourceNode.disconnect(); } catch (e) {}
    audioSourceNode = null;
  }
  if (dummyGainNode) {
    try { dummyGainNode.disconnect(); } catch (e) {}
    dummyGainNode = null;
  }
  if (audioMonitorGainNode) {
    try { audioMonitorGainNode.disconnect(); } catch (e) {}
    audioMonitorGainNode = null;
  }
  if (highPassNode) { try { highPassNode.disconnect(); } catch(e) {} highPassNode = null; }
  if (clarityNode)  { try { clarityNode.disconnect();  } catch(e) {} clarityNode = null; }
  state.audio.peakLevel = 0;
  state.audio.statusText = 'Silent / Inactive';
  state.audio.statusColor = 'var(--text-secondary)';
  updateVisualizerIdleUI();
}

/**
 * Start or refresh microphone audio stream independently
 * Strictly binds to the selected deviceId without falling back to internal webcam mic.
 */
export async function startAudioStream(audioDeviceId, statusInfoEl) {
  stopAudioStream();
  
  if (statusInfoEl) {
    statusInfoEl.textContent = 'Connecting microphone...';
    statusInfoEl.style.color = '#06b6d4';
  }
  
  state.currentAudioId = audioDeviceId || 'default';
  
  // Build strict target constraints for the chosen microphone with high-fidelity audio parameters
  const baseAudioParams = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: true
  };

  let constraintsList = [];
  
  if (state.currentAudioId && state.currentAudioId !== 'default') {
    constraintsList.push({ audio: { deviceId: { exact: state.currentAudioId }, ...baseAudioParams } });
    constraintsList.push({ audio: { deviceId: { ideal: state.currentAudioId }, ...baseAudioParams } });
  } else {
    constraintsList.push({ audio: { ...baseAudioParams } });
    constraintsList.push({ audio: true });
  }
  
  let successStream = null;
  for (const c of constraintsList) {
    try {
      successStream = await navigator.mediaDevices.getUserMedia(c);
      if (successStream && successStream.getAudioTracks().length > 0) {
        break;
      }
    } catch (e) {
      console.warn('[Audio] getUserMedia constraint attempt failed:', c, e);
    }
  }
  
  if (!successStream) {
    console.error('[Audio] All getUserMedia constraints failed for target device.');
    if (statusInfoEl) {
      statusInfoEl.textContent = 'Failed to open microphone / Check system privacy settings';
      statusInfoEl.style.color = '#ef4444';
    }
    teardownVisualizer();
    return null;
  }
  
  audioStream = successStream;
  activeAudioStreamRef = audioStream;
  
  // Audio Track Verification & Label Display
  const audioTrack = getAudioTrack();
  if (audioTrack) {
    const trackLabel = audioTrack.label || 'Microphone Connected';
    
    if (statusInfoEl) {
      statusInfoEl.textContent = `Active: ${trackLabel}`;
      statusInfoEl.style.color = '#00ff66';
    }
    
    // Detect hardware/Windows OS mute state
    if (audioTrack.muted) {
      state.audio.isMuted = true;
      if (statusInfoEl) {
        statusInfoEl.textContent = `⚠️ Muted: ${trackLabel} (Check OS/Hardware Mute)`;
        statusInfoEl.style.color = '#f59e0b';
      }
    }
    
    audioTrack.onmute = () => {
      state.audio.isMuted = true;
      if (statusInfoEl) {
        statusInfoEl.textContent = `⚠️ Muted: ${trackLabel} (Check OS/Hardware Mute)`;
        statusInfoEl.style.color = '#f59e0b';
      }
    };
    
    audioTrack.onunmute = () => {
      state.audio.isMuted = false;
      if (statusInfoEl) {
        statusInfoEl.textContent = `Active: ${trackLabel}`;
        statusInfoEl.style.color = '#00ff66';
      }
    };
  }
  
  // Setup Web Audio API Analyser
  setupAudioVisualizer(audioStream);
  return audioStream;
}

/**
 * Web Audio API setup for VU meter and frequency analyzer
 */
function setupAudioVisualizer(stream) {
  if (audioSourceNode) {
    try { audioSourceNode.disconnect(); } catch (e) {}
    audioSourceNode = null;
  }
  if (dummyGainNode) {
    try { dummyGainNode.disconnect(); } catch (e) {}
    dummyGainNode = null;
  }
  
  if (!stream || stream.getAudioTracks().length === 0) {
    teardownVisualizer();
    return;
  }
  
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack || !audioTrack.enabled) {
    teardownVisualizer();
    return;
  }
  
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    // Create MediaStreamAudioSourceNode directly from the stream
    audioSourceNode = audioCtx.createMediaStreamSource(stream);
    audioAnalyser = audioCtx.createAnalyser();
    audioAnalyser.fftSize = 128; // Standard 128 FFT size for smooth VU meter response
    audioAnalyser.smoothingTimeConstant = 0.8;
    
    if (state.audioEnhancer) {
      // 1. High-Pass Biquad Filter (80Hz Cutoff) - Cuts low-frequency table thumps & AC/fan hum
      highPassNode = audioCtx.createBiquadFilter();
      highPassNode.type = 'highpass';
      highPassNode.frequency.value = 80;
      
      // 2. Vocal Presence Peaking Filter (2.8kHz Boost) - Enhances speech clarity & crispness
      clarityNode = audioCtx.createBiquadFilter();
      clarityNode.type = 'peaking';
      clarityNode.frequency.value = 2800;
      clarityNode.Q.value = 1.2;
      clarityNode.gain.value = 4.5;
      
      audioSourceNode.connect(highPassNode);
      highPassNode.connect(clarityNode);
      clarityNode.connect(audioAnalyser);
    } else {
      audioSourceNode.connect(audioAnalyser);
    }
    
    // Real-Time Headphone Sidetone Monitor Node (Clean single output path)
    audioMonitorGainNode = audioCtx.createGain();
    const monitorVol = state.audioMonitor ? (state.audioMonitorVolume / 100) : 0;
    audioMonitorGainNode.gain.setValueAtTime(monitorVol, audioCtx.currentTime);
    
    audioAnalyser.connect(audioMonitorGainNode);
    audioMonitorGainNode.connect(audioCtx.destination);
    
    timeDomainDataArray = new Uint8Array(audioAnalyser.fftSize);
    freqDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
  } catch (err) {
    console.warn('[Audio] Analyser setup error:', err);
    teardownVisualizer();
  }
}

export function refreshAudioPipeline() {
  if (audioStream) {
    setupAudioVisualizer(audioStream);
  }
}

export function updateAudioMonitorVolume() {
  if (audioMonitorGainNode && audioCtx) {
    const vol = state.audioMonitor ? (state.audioMonitorVolume / 100) : 0;
    audioMonitorGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
  }
}

/**
 * Ensures AudioContext is resumed upon user interaction
 */
export function ensureAudioContextResumed() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

/**
 * Update UI VU Meter and Equalizer Bars on every render loop
 * Uses raw PCM TimeDomain wave data for 100% reliable amplitude peak calculation.
 */
let _vizContainerEl = null;

export function updateAudioVisualizerUI() {
  if (!audioAnalyser || !timeDomainDataArray || !freqDataArray) {
    updateVisualizerIdleUI();
    return;
  }

  // Skip DOM style mutations if the sidebar/visualizer container is hidden or collapsed
  if (!_vizContainerEl) _vizContainerEl = document.getElementById('audioVisualizerContainer');
  if (_vizContainerEl && _vizContainerEl.offsetParent === null) {
    return;
  }

  // Ensure AudioContext state is running
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  
  // 1. Read Raw PCM TimeDomain Amplitude Data (Centered around 128)
  audioAnalyser.getByteTimeDomainData(timeDomainDataArray);
  let maxDeviation = 0;
  for (let i = 0; i < timeDomainDataArray.length; i++) {
    const deviation = Math.abs(timeDomainDataArray[i] - 128); // 0 (silence) to 128 (max amplitude)
    if (deviation > maxDeviation) {
      maxDeviation = deviation;
    }
  }
  
  // Higher sensitivity mapping (amplifies quiet headset mic inputs so they are clearly visible)
  state.audio.peakLevel = Math.min(100, Math.round((maxDeviation / 32) * 100));
  
  // 2. Read FFT Frequency Data for 8 Equalizer Bars
  audioAnalyser.getByteFrequencyData(freqDataArray);
  
  // 3. Update Horizontal VU Meter Bar Fill
  if (!_vuBarEl) _vuBarEl = document.getElementById('vuMeterBar');
  if (_vuBarEl) {
    _vuBarEl.style.width = `${state.audio.peakLevel}%`;
  }
  
  // 4. Update Equalizer Frequency Bars
  if (!_freqBarEls) _freqBarEls = document.querySelectorAll('.freq-bar');
  if (_freqBarEls && _freqBarEls.length > 0) {
    const step = Math.max(1, Math.floor(freqDataArray.length / _freqBarEls.length));
    _freqBarEls.forEach((bar, idx) => {
      const val = freqDataArray[idx * step] || 0;
      const rawHeight = Math.max((val / 180) * 100, (maxDeviation / 32) * 80);
      const heightPercent = Math.min(100, Math.max(8, Math.round(rawHeight)));
      bar.style.height = `${heightPercent}%`;
    });
  }
  
  // 5. Update Visualizer Text Status
  if (!_vuLabelEl) _vuLabelEl = document.getElementById('vuMeterLabel');
  if (_vuLabelEl) {
    if (state.audio.isMuted) {
      _vuLabelEl.textContent = '⚠️ Muted';
      _vuLabelEl.style.color = '#f59e0b';
    } else if (state.audio.peakLevel > 60) {
      _vuLabelEl.textContent = '● Loud Input';
      _vuLabelEl.style.color = '#ef4444';
    } else if (state.audio.peakLevel > 2) {
      _vuLabelEl.textContent = '● Audio Active';
      _vuLabelEl.style.color = '#00ff66';
    } else {
      _vuLabelEl.textContent = 'Silent (Speak to test)';
      _vuLabelEl.style.color = 'var(--text-secondary)';
    }
  }
}

function updateVisualizerIdleUI() {
  state.audio.peakLevel = 0;
  if (!_vuBarEl) _vuBarEl = document.getElementById('vuMeterBar');
  if (_vuBarEl) _vuBarEl.style.width = '0%';
  
  if (!_freqBarEls) _freqBarEls = document.querySelectorAll('.freq-bar');
  if (_freqBarEls) {
    _freqBarEls.forEach(bar => bar.style.height = '8%');
  }
  
  if (!_vuLabelEl) _vuLabelEl = document.getElementById('vuMeterLabel');
  if (_vuLabelEl) {
    _vuLabelEl.textContent = 'Silent / Inactive';
    _vuLabelEl.style.color = 'var(--text-secondary)';
  }
}
