/**
 * js/ui/uiPresets.js
 * Preset Manager & Custom User Preset Storage Engine
 */

import { state } from '../state.js';

export const presetsMap = {
  none: {
    brightness: 100, contrast: 100, saturation: 100, pixelSize: 4,
    scanlines: 0, grain: 0, vignette: 0, rounded: 16
  },
  lofi: {
    brightness: 105, contrast: 115, saturation: 125, pixelSize: 4,
    scanlines: 15, grain: 25, vignette: 35, rounded: 20
  },
  vhs: {
    brightness: 110, contrast: 120, saturation: 85, pixelSize: 4,
    scanlines: 45, grain: 35, vignette: 40, rounded: 12
  },
  cinematic: {
    brightness: 105, contrast: 125, saturation: 135, pixelSize: 4,
    scanlines: 10, grain: 15, vignette: 30, rounded: 16
  },
  monochrome: {
    brightness: 105, contrast: 140, saturation: 0, pixelSize: 4,
    scanlines: 20, grain: 50, vignette: 60, rounded: 16
  },
  pixel: {
    brightness: 105, contrast: 125, saturation: 130, pixelSize: 6,
    scanlines: 40, grain: 15, vignette: 25, rounded: 8
  },
  custom_lut: {
    brightness: 100, contrast: 100, saturation: 100, pixelSize: 4,
    scanlines: 0, grain: 0, vignette: 0, rounded: 16
  }
};

export function applyPreset(presetKey, elements) {
  state.activeFilter = presetKey;
  const config = presetsMap[presetKey] || presetsMap.none;

  state.videoAdjustments.brightness = config.brightness;
  state.videoAdjustments.contrast = config.contrast;
  state.videoAdjustments.saturation = config.saturation;
  state.videoAdjustments.pixelSize = config.pixelSize;

  state.overlays.scanlines = config.scanlines;
  state.overlays.grain = config.grain;
  state.overlays.vignette = config.vignette;
  state.overlays.rounded = config.rounded;

  if (elements) {
    const {
      brightnessSlider, contrastSlider, saturationSlider, pixelSizeSlider,
      scanlinesSlider, grainSlider, vignetteSlider, roundedSlider, canvasContainer
    } = elements;

    if (brightnessSlider) { brightnessSlider.value = config.brightness; document.getElementById('brightnessVal').textContent = `${config.brightness}%`; }
    if (contrastSlider) { contrastSlider.value = config.contrast; document.getElementById('contrastVal').textContent = `${config.contrast}%`; }
    if (saturationSlider) { saturationSlider.value = config.saturation; document.getElementById('saturationVal').textContent = `${config.saturation}%`; }
    if (pixelSizeSlider) { pixelSizeSlider.value = config.pixelSize; document.getElementById('pixelSizeVal').textContent = `${config.pixelSize}px`; }

    if (scanlinesSlider) { scanlinesSlider.value = config.scanlines; document.getElementById('scanlinesVal').textContent = `${config.scanlines}%`; }
    if (grainSlider) { grainSlider.value = config.grain; document.getElementById('grainVal').textContent = `${config.grain}%`; }
    if (vignetteSlider) { vignetteSlider.value = config.vignette; document.getElementById('vignetteVal').textContent = `${config.vignette}%`; }
    if (roundedSlider) { roundedSlider.value = config.rounded; document.getElementById('roundedVal').textContent = `${config.rounded}px`; }

    if (canvasContainer) { canvasContainer.style.borderRadius = `${config.rounded}px`; }
  }

  document.querySelectorAll('.filter-btn').forEach(b => {
    if (b.getAttribute('data-filter') === presetKey) b.classList.add('active');
    else b.classList.remove('active');
  });
}

export function getUserPresetsFromStorage() {
  try {
    const data = localStorage.getItem('8fps_user_presets');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveUserPresetToStorage(presetObj) {
  const presets = getUserPresetsFromStorage();
  presets.push(presetObj);
  try {
    localStorage.setItem('8fps_user_presets', JSON.stringify(presets));
  } catch (e) {}
}

export function deleteUserPresetFromStorage(id) {
  let presets = getUserPresetsFromStorage();
  presets = presets.filter(p => p.id !== id);
  try {
    localStorage.setItem('8fps_user_presets', JSON.stringify(presets));
  } catch (e) {}
}

export function renderUserPresetsInGrid(elements) {
  const filterGrid = document.querySelector('.filter-grid');
  if (!filterGrid) return;

  filterGrid.querySelectorAll('.user-preset-btn').forEach(btn => btn.remove());
  const userPresets = getUserPresetsFromStorage();

  userPresets.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn user-preset-btn';
    btn.setAttribute('data-user-preset-id', preset.id);

    btn.innerHTML = `
      <div class="filter-preview filter-user-preset"></div>
      <span>${preset.name}</span>
      <i data-lucide="trash-2" class="delete-preset-icon" title="Delete custom preset"></i>
    `;

    btn.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-preset-icon') || e.target.closest('.delete-preset-icon')) {
        return;
      }
      applyUserPresetObject(preset, elements, btn);
    });

    filterGrid.appendChild(btn);

    if (window.lucide) window.lucide.createIcons();

    const deleteIcon = btn.querySelector('.delete-preset-icon');
    if (deleteIcon) {
      deleteIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        deleteUserPresetFromStorage(preset.id);
        btn.remove();
        if (state.activeFilter === preset.id) {
          applyPreset('none', elements);
        }
      });
    }
  });
}

export function applyUserPresetObject(preset, elements, activeBtn) {
  state.activeFilter = preset.id;
  state.videoAdjustments.brightness = preset.brightness;
  state.videoAdjustments.contrast = preset.contrast;
  state.videoAdjustments.saturation = preset.saturation;
  state.videoAdjustments.pixelSize = preset.pixelSize;

  state.overlays.scanlines = preset.scanlines;
  state.overlays.grain = preset.grain;
  state.overlays.vignette = preset.vignette;
  state.overlays.rounded = preset.rounded;

  if (elements) {
    const {
      brightnessSlider, contrastSlider, saturationSlider, pixelSizeSlider,
      scanlinesSlider, grainSlider, vignetteSlider, roundedSlider, canvasContainer
    } = elements;

    if (brightnessSlider) { brightnessSlider.value = preset.brightness; document.getElementById('brightnessVal').textContent = `${preset.brightness}%`; }
    if (contrastSlider) { contrastSlider.value = preset.contrast; document.getElementById('contrastVal').textContent = `${preset.contrast}%`; }
    if (saturationSlider) { saturationSlider.value = preset.saturation; document.getElementById('saturationVal').textContent = `${preset.saturation}%`; }
    if (pixelSizeSlider) { pixelSizeSlider.value = preset.pixelSize; document.getElementById('pixelSizeVal').textContent = `${preset.pixelSize}px`; }

    if (scanlinesSlider) { scanlinesSlider.value = preset.scanlines; document.getElementById('scanlinesVal').textContent = `${preset.scanlines}%`; }
    if (grainSlider) { grainSlider.value = preset.grain; document.getElementById('grainVal').textContent = `${preset.grain}%`; }
    if (vignetteSlider) { vignetteSlider.value = preset.vignette; document.getElementById('vignetteVal').textContent = `${preset.vignette}%`; }
    if (roundedSlider) { roundedSlider.value = preset.rounded; document.getElementById('roundedVal').textContent = `${preset.rounded}px`; }
    if (canvasContainer) { canvasContainer.style.borderRadius = `${preset.rounded}px`; }
  }

  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (activeBtn) activeBtn.classList.add('active');
}
