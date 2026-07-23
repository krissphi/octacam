/**
 * js/ui/uiTeleprompter.js
 * Interactive Teleprompter Overlay & Ultra-Smooth Auto-Scroll Engine
 * Features 60 FPS subpixel float scrolling, font sizing, opacity adjustments,
 * draggable overlay position, and mirror text mode.
 */

import { state, saveUserPreferences } from '../state.js';

let scrollAnimId = null;
let lastScrollTimestamp = 0;
let currentScrollY = 0;

export function bindTeleprompterEvents() {
  const toggleTeleprompter = document.getElementById('toggleTeleprompter');
  const teleprompterControlsWrapper = document.getElementById('teleprompterControlsWrapper');
  const teleprompterScriptInput = document.getElementById('teleprompterScriptInput');
  const teleprompterOverlay = document.getElementById('teleprompterOverlay');
  const teleprompterTextDisplay = document.getElementById('teleprompterTextDisplay');
  const teleprompterTextContainer = document.getElementById('teleprompterTextContainer');
  const teleprompterBody = document.getElementById('teleprompterBody');
  const teleprompterHeader = document.getElementById('teleprompterHeader');

  const tpSpeedSlider = document.getElementById('tpSpeedSlider');
  const tpSpeedVal = document.getElementById('tpSpeedVal');
  const tpFontSizeSlider = document.getElementById('tpFontSizeSlider');
  const tpFontSizeVal = document.getElementById('tpFontSizeVal');
  const tpOpacitySlider = document.getElementById('tpOpacitySlider');
  const tpOpacityVal = document.getElementById('tpOpacityVal');
  const toggleTpMirror = document.getElementById('toggleTpMirror');

  const tpPlayBtn = document.getElementById('tpPlayBtn');
  const tpPlayIcon = document.getElementById('tpPlayIcon');
  const tpResetBtn = document.getElementById('tpResetBtn');
  const tpFontPlusBtn = document.getElementById('tpFontPlusBtn');
  const tpFontMinusBtn = document.getElementById('tpFontMinusBtn');
  const tpCloseBtn = document.getElementById('tpCloseBtn');

  const tpSidebarPlayBtn = document.getElementById('tpSidebarPlayBtn');
  const tpSidebarPlayIcon = document.getElementById('tpSidebarPlayIcon');
  const tpSidebarPlayText = document.getElementById('tpSidebarPlayText');
  const tpSidebarResetBtn = document.getElementById('tpSidebarResetBtn');

  // Set initial script text
  if (teleprompterScriptInput) {
    teleprompterScriptInput.value = state.teleprompter.text;
  }
  if (teleprompterTextDisplay) {
    teleprompterTextDisplay.textContent = state.teleprompter.text;
  }

  // Sync manual scroll position when user scrolls with wheel/touch
  if (teleprompterBody) {
    teleprompterBody.addEventListener('scroll', () => {
      if (!state.teleprompter.isScrolling) {
        currentScrollY = teleprompterBody.scrollTop;
      }
    }, { passive: true });
  }

  // Toggle Teleprompter Visibility
  if (toggleTeleprompter) {
    toggleTeleprompter.addEventListener('change', () => {
      state.teleprompter.enabled = toggleTeleprompter.checked;
      if (teleprompterControlsWrapper) {
        teleprompterControlsWrapper.style.display = state.teleprompter.enabled ? 'block' : 'none';
      }
      if (teleprompterOverlay) {
        if (state.teleprompter.enabled) {
          teleprompterOverlay.classList.remove('hidden');
          if (window.lucide) window.lucide.createIcons();
        } else {
          teleprompterOverlay.classList.add('hidden');
          stopAutoScroll();
        }
      }
      saveUserPreferences();
    });
  }

  // Script text input sync
  if (teleprompterScriptInput) {
    teleprompterScriptInput.addEventListener('input', () => {
      const text = teleprompterScriptInput.value;
      state.teleprompter.text = text;
      if (teleprompterTextDisplay) {
        teleprompterTextDisplay.textContent = text || 'Type your script here...';
      }
      saveUserPreferences();
    });
  }

  // Speed slider
  if (tpSpeedSlider) {
    tpSpeedSlider.addEventListener('input', () => {
      const speed = parseInt(tpSpeedSlider.value, 10);
      state.teleprompter.speed = speed;
      if (tpSpeedVal) tpSpeedVal.textContent = speed;
      saveUserPreferences();
    });
  }

  // Font size slider
  if (tpFontSizeSlider) {
    tpFontSizeSlider.addEventListener('input', () => {
      const size = parseInt(tpFontSizeSlider.value, 10);
      setFontSize(size);
      saveUserPreferences();
    });
  }

  function setFontSize(size) {
    state.teleprompter.fontSize = size;
    if (tpFontSizeVal) tpFontSizeVal.textContent = `${size}px`;
    if (tpFontSizeSlider) tpFontSizeSlider.value = size;
    if (teleprompterTextDisplay) teleprompterTextDisplay.style.fontSize = `${size}px`;
  }

  if (tpFontPlusBtn) {
    tpFontPlusBtn.addEventListener('click', () => {
      const newSize = Math.min(48, state.teleprompter.fontSize + 2);
      setFontSize(newSize);
      saveUserPreferences();
    });
  }

  if (tpFontMinusBtn) {
    tpFontMinusBtn.addEventListener('click', () => {
      const newSize = Math.max(16, state.teleprompter.fontSize - 2);
      setFontSize(newSize);
      saveUserPreferences();
    });
  }

  // Opacity slider
  if (tpOpacitySlider) {
    tpOpacitySlider.addEventListener('input', () => {
      const opacity = parseInt(tpOpacitySlider.value, 10);
      state.teleprompter.opacity = opacity;
      if (tpOpacityVal) tpOpacityVal.textContent = `${opacity}%`;
      if (teleprompterOverlay) {
        teleprompterOverlay.style.background = `rgba(15, 23, 42, ${opacity / 100})`;
      }
      saveUserPreferences();
    });
  }

  // Mirror toggle
  if (toggleTpMirror) {
    toggleTpMirror.addEventListener('change', () => {
      state.teleprompter.mirror = toggleTpMirror.checked;
      if (teleprompterTextContainer) {
        if (state.teleprompter.mirror) {
          teleprompterTextContainer.classList.add('mirrored');
        } else {
          teleprompterTextContainer.classList.remove('mirrored');
        }
      }
      saveUserPreferences();
    });
  }

  // Play / Pause Toggle
  function togglePlayPause() {
    if (state.teleprompter.isScrolling) {
      stopAutoScroll();
    } else {
      startAutoScroll();
    }
  }

  if (tpPlayBtn) tpPlayBtn.addEventListener('click', togglePlayPause);
  if (tpSidebarPlayBtn) tpSidebarPlayBtn.addEventListener('click', togglePlayPause);

  // Rewind Reset to top
  function resetToTop() {
    currentScrollY = 0;
    if (teleprompterBody) {
      teleprompterBody.scrollTop = 0;
    }
  }

  if (tpResetBtn) tpResetBtn.addEventListener('click', resetToTop);
  if (tpSidebarResetBtn) tpSidebarResetBtn.addEventListener('click', resetToTop);

  // Close overlay button
  if (tpCloseBtn) {
    tpCloseBtn.addEventListener('click', () => {
      state.teleprompter.enabled = false;
      if (toggleTeleprompter) toggleTeleprompter.checked = false;
      if (teleprompterControlsWrapper) teleprompterControlsWrapper.style.display = 'none';
      if (teleprompterOverlay) teleprompterOverlay.classList.add('hidden');
      stopAutoScroll();
      saveUserPreferences();
    });
  }

  // Ultra-Smooth 60 FPS Subpixel Auto-Scroll Engine
  function startAutoScroll() {
    if (!teleprompterBody) return;
    state.teleprompter.isScrolling = true;
    updatePlayUI(true);
    currentScrollY = teleprompterBody.scrollTop;
    lastScrollTimestamp = performance.now();

    function scrollStep(timestamp) {
      if (!state.teleprompter.isScrolling) return;

      // Clamp delta to prevent jumps if tab loses focus
      const deltaSec = Math.min(0.05, (timestamp - lastScrollTimestamp) / 1000);
      lastScrollTimestamp = timestamp;

      if (teleprompterBody) {
        // Speed scaling: speed 1 = 16px/sec, speed 10 = 160px/sec
        const pixelsPerSec = state.teleprompter.speed * 16;
        currentScrollY += pixelsPerSec * deltaSec;
        teleprompterBody.scrollTop = currentScrollY;

        // Auto-pause when reaching the very end
        const maxScroll = teleprompterBody.scrollHeight - teleprompterBody.clientHeight;
        if (teleprompterBody.scrollTop >= maxScroll - 2) {
          stopAutoScroll();
          return;
        }
      }

      scrollAnimId = requestAnimationFrame(scrollStep);
    }

    scrollAnimId = requestAnimationFrame(scrollStep);
  }

  function stopAutoScroll() {
    state.teleprompter.isScrolling = false;
    if (scrollAnimId) {
      cancelAnimationFrame(scrollAnimId);
      scrollAnimId = null;
    }
    updatePlayUI(false);
  }

  function updatePlayUI(isPlaying) {
    if (tpPlayIcon) {
      tpPlayIcon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
    }
    if (tpSidebarPlayIcon) {
      tpSidebarPlayIcon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
    }
    if (tpSidebarPlayText) {
      tpSidebarPlayText.textContent = isPlaying ? 'Pause Scroll' : 'Start Scroll';
    }
    if (tpSidebarPlayBtn) {
      if (isPlaying) {
        tpSidebarPlayBtn.classList.remove('btn-primary');
        tpSidebarPlayBtn.classList.add('btn-secondary');
      } else {
        tpSidebarPlayBtn.classList.remove('btn-secondary');
        tpSidebarPlayBtn.classList.add('btn-primary');
      }
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // Draggable Header logic
  if (teleprompterHeader && teleprompterOverlay) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    teleprompterHeader.style.cursor = 'grab';

    teleprompterHeader.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.teleprompter-actions')) return;
      isDragging = true;
      teleprompterHeader.style.cursor = 'grabbing';
      try { teleprompterHeader.setPointerCapture(e.pointerId); } catch (err) {}

      startX = e.clientX;
      startY = e.clientY;

      const rect = teleprompterOverlay.getBoundingClientRect();
      const parentRect = teleprompterOverlay.offsetParent ? teleprompterOverlay.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };

      initialLeft = rect.left - parentRect.left;
      initialTop = rect.top - parentRect.top;

      teleprompterOverlay.style.transform = 'none';
      teleprompterOverlay.style.left = `${initialLeft}px`;
      teleprompterOverlay.style.top = `${initialTop}px`;
    });

    teleprompterHeader.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      teleprompterOverlay.style.left = `${initialLeft + dx}px`;
      teleprompterOverlay.style.top = `${initialTop + dy}px`;
    });

    const endDrag = (e) => {
      if (!isDragging) return;
      isDragging = false;
      teleprompterHeader.style.cursor = 'grab';
      try { teleprompterHeader.releasePointerCapture(e.pointerId); } catch (err) {}
    };

    teleprompterHeader.addEventListener('pointerup', endDrag);
    teleprompterHeader.addEventListener('pointercancel', endDrag);
  }
}
