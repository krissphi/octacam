/**
 * js/snapshot.js
 * Camera Snapshot / Photo Capture Module
 * Features instant photo capture, 3-second countdown timer (3-2-1),
 * shutter feedback sounds, and floating thumbnail gallery drawer.
 */

import { state } from './state.js';

let isCountdownActive = false;

export function triggerSnapshotFlow(canvasEl, containerEl, statusEl) {
  if (state.countdownSeconds > 0) {
    startCountdownSnapshot(canvasEl, containerEl, statusEl);
  } else {
    takePhotoSnapshot(canvasEl, containerEl, statusEl);
  }
}

export function startCountdownSnapshot(canvasEl, containerEl, statusEl) {
  if (isCountdownActive || !canvasEl) return;

  const overlayEl = document.getElementById('countdownOverlay');
  const numberEl = document.getElementById('countdownNumber');
  if (!overlayEl || !numberEl) {
    takePhotoSnapshot(canvasEl, containerEl, statusEl);
    return;
  }

  isCountdownActive = true;
  let count = state.countdownSeconds || 3;

  overlayEl.classList.remove('hidden');
  numberEl.textContent = count;
  playCountdownBeep(440);

  const timer = setInterval(() => {
    try {
      count--;
      if (count > 0) {
        numberEl.textContent = count;
        numberEl.style.animation = 'none';
        void numberEl.offsetWidth;
        numberEl.style.animation = 'countPulse 0.6s ease-out';
        playCountdownBeep(440);
      } else {
        clearInterval(timer);
        overlayEl.classList.add('hidden');
        isCountdownActive = false;
        playCountdownBeep(880);
        takePhotoSnapshot(canvasEl, containerEl, statusEl);
      }
    } catch (err) {
      // Always unblock snapshot button on any unexpected error
      clearInterval(timer);
      overlayEl.classList.add('hidden');
      isCountdownActive = false;
      console.error('[Snapshot] Countdown error:', err);
    }
  }, 1000);
}

export function takePhotoSnapshot(canvasEl, containerEl, statusEl) {
  if (!canvasEl || canvasEl.width === 0 || canvasEl.height === 0) return;

  // 1. Trigger Shutter Flash Animation
  if (containerEl) {
    containerEl.classList.remove('shutter-flash');
    void containerEl.offsetWidth; // Force reflow for animation restart
    containerEl.classList.add('shutter-flash');
    setTimeout(() => {
      containerEl.classList.remove('shutter-flash');
    }, 400);
  }

  // 2. Play subtle shutter feedback sound
  playShutterSound();

  // 3. Generate filename
  const dateStr = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `octacam-photo-${dateStr}.png`;

  // 4. Update UI Status Text
  if (statusEl) {
    const origText = statusEl.textContent;
    statusEl.textContent = '📸 Photo Added to Gallery (Check Bottom Right)';
    statusEl.style.color = '#06b6d4';
    setTimeout(() => {
      statusEl.textContent = origText || 'Ready to Record / Take Photo';
      statusEl.style.color = 'var(--text-secondary)';
    }, 2500);
  }

  // 5. Add Photo to Floating Gallery Drawer at Bottom Right
  addPhotoToGallery(canvasEl, filename);
}

function addPhotoToGallery(canvasEl, filename) {
  const galleryEl = document.getElementById('snapshotGallery');
  if (!galleryEl) return;

  // Use Blob URL instead of toDataURL to avoid holding MB of Base64 in JS closures
  canvasEl.toBlob((blob) => {
    if (!blob) return;
    const blobUrl = URL.createObjectURL(blob);

    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.title = `Click to download ${filename}`;

    card.innerHTML = `
      <img src="${blobUrl}" alt="Snapshot Preview">
      <div class="gallery-actions">
        <button class="gallery-btn download-btn" title="Download Photo" aria-label="Download Photo ${filename}">
          <i data-lucide="download"></i>
        </button>
        <button class="gallery-btn delete-btn" title="Delete Photo" aria-label="Delete Photo ${filename}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    const triggerDownload = (e) => {
      e.stopPropagation();
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
    };

    card.querySelector('img').addEventListener('click', triggerDownload);
    card.querySelector('.download-btn').addEventListener('click', triggerDownload);

    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      // Revoke the blob URL immediately on delete to free RAM
      URL.revokeObjectURL(blobUrl);
      card.style.transform = 'scale(0) translateY(20px)';
      card.style.opacity = '0';
      card.style.transition = 'all 0.25s ease';
      setTimeout(() => {
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 250);
    });

    galleryEl.insertBefore(card, galleryEl.firstChild);
    if (window.lucide) window.lucide.createIcons();
  }, 'image/png');
}

let _shutterCtx = null;

function getShutterContext() {
  if (!_shutterCtx || _shutterCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    _shutterCtx = new AudioContextClass();
  }
  if (_shutterCtx.state === 'suspended') {
    _shutterCtx.resume().catch(() => {});
  }
  return _shutterCtx;
}

function playShutterSound() {
  try {
    const ctx = getShutterContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

function playCountdownBeep(freq = 440) {
  try {
    const ctx = getShutterContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}
