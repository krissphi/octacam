/**
 * js/ui/uiZoom.js
 * Click-to-Zoom / Hold-to-Magnify Event Controller
 * Enables interactive pointer-based smooth zoom on the video canvas.
 */

import { state, saveUserPreferences } from '../state.js';

export function bindZoomEvents() {
  const toggleClickToZoom = document.getElementById('toggleClickToZoom');
  const zoomFactorSlider = document.getElementById('zoomFactorSlider');
  const zoomFactorWrapper = document.getElementById('zoomFactorWrapper');
  const zoomFactorVal = document.getElementById('zoomFactorVal');
  const canvasContainer = document.getElementById('canvasContainer');
  const cameraCanvas = document.getElementById('cameraCanvas');

  if (toggleClickToZoom) {
    toggleClickToZoom.addEventListener('change', () => {
      state.zoom.enabled = toggleClickToZoom.checked;
      if (zoomFactorWrapper) {
        zoomFactorWrapper.style.display = state.zoom.enabled ? 'block' : 'none';
      }
      updateZoomCursor();
      saveUserPreferences();
    });
  }

  if (zoomFactorSlider) {
    zoomFactorSlider.addEventListener('input', () => {
      const val = parseFloat(zoomFactorSlider.value);
      state.zoom.factor = val;
      if (zoomFactorVal) zoomFactorVal.textContent = `${val.toFixed(1)}x`;
      saveUserPreferences();
    });
  }

  function updateZoomCursor() {
    if (!canvasContainer) return;
    if (state.zoom.enabled) {
      canvasContainer.classList.add('zoom-enabled');
    } else {
      canvasContainer.classList.remove('zoom-enabled');
      canvasContainer.classList.remove('zoom-active');
      state.zoom.active = false;
    }
  }

  if (cameraCanvas) {
    const handlePointerStart = (e) => {
      if (!state.zoom.enabled) return;
      try { cameraCanvas.setPointerCapture(e.pointerId); } catch (err) {}

      const rect = cameraCanvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const clickX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const clickY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      // Always snap current coordinates instantly on new pointerdown if not currently active
      // to guarantee zero sliding from previous zoom positions.
      if (!state.zoom.active || state.zoom.currentFactor <= 1.05) {
        state.zoom.currentX = clickX;
        state.zoom.currentY = clickY;
        state.zoom.currentFactor = 1.0;
      }
      state.zoom.targetX = clickX;
      state.zoom.targetY = clickY;
      state.zoom.active = true;

      if (canvasContainer) canvasContainer.classList.add('zoom-active');
    };

    const handlePointerMove = (e) => {
      if (!state.zoom.enabled || !state.zoom.active) return;

      const rect = cameraCanvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const clickX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const clickY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      state.zoom.targetX = clickX;
      state.zoom.targetY = clickY;
    };

    const handlePointerEnd = (e) => {
      if (!state.zoom.enabled) return;
      state.zoom.active = false;
      if (canvasContainer) canvasContainer.classList.remove('zoom-active');
      try { cameraCanvas.releasePointerCapture(e.pointerId); } catch (err) {}
    };

    cameraCanvas.addEventListener('pointerdown', handlePointerStart);
    cameraCanvas.addEventListener('pointermove', handlePointerMove);
    cameraCanvas.addEventListener('pointerup', handlePointerEnd);
    cameraCanvas.addEventListener('pointercancel', handlePointerEnd);
    cameraCanvas.addEventListener('mouseleave', handlePointerEnd);
  }
}
