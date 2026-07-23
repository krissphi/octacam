/**
 * js/ui/uiGrid.js
 * Composition Grid Guides Event Controller (Rule of Thirds, Golden Ratio, Crosshair, Diagonal)
 * Controls framing overlays for alignment and composition positioning.
 */

import { state, saveUserPreferences } from '../state.js';

export function bindGridEvents() {
  const toggleGrid = document.getElementById('toggleGrid');
  const gridPresetWrapper = document.getElementById('gridPresetWrapper');
  const gridButtons = document.querySelectorAll('.grid-btn');

  // Handle grid toggle switch
  if (toggleGrid) {
    toggleGrid.addEventListener('change', () => {
      state.grid.enabled = toggleGrid.checked;
      if (gridPresetWrapper) {
        gridPresetWrapper.style.display = state.grid.enabled ? 'block' : 'none';
      }
      saveUserPreferences();
    });
  }

  // Handle grid guide type preset buttons
  gridButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-grid') || 'thirds';
      state.grid.type = type;

      // Update active button state exclusively among .grid-btn elements
      gridButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      saveUserPreferences();
    });
  });
}
