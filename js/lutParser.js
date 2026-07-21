/**
 * js/lutParser.js
 * 3D LUT (.cube) Parser & Color Grading Application Engine
 * Supports Photoshop, Lightroom, Premiere Pro & DaVinci Resolve 3D LUT files.
 * Features localStorage persistence so custom LUTs persist across page reloads.
 */

import { state } from './state.js';

let customLutData = null; // Uint8Array color lookup table
let customLutSize = 0;    // e.g. 17 or 33
let customLutName = '';

export function getCustomLutData() {
  return customLutData;
}

export function getCustomLutSize() {
  return customLutSize;
}

export function getCustomLutName() {
  return customLutName;
}

/**
 * Parse Adobe/Photoshop .cube file content
 */
export function parseCubeLut(fileText, filename = 'Custom LUT') {
  const lines = fileText.split(/\r?\n/);
  let size = 0;
  const tableValues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('LUT_3D_SIZE')) {
      const parts = line.split(/\s+/);
      size = parseInt(parts[1], 10);
      continue;
    }

    if (line.startsWith('TITLE') || line.startsWith('DOMAIN_')) {
      continue;
    }

    const tokens = line.split(/\s+/);
    if (tokens.length >= 3) {
      const r = parseFloat(tokens[0]);
      const g = parseFloat(tokens[1]);
      const b = parseFloat(tokens[2]);

      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        tableValues.push(
          Math.min(255, Math.max(0, Math.round(r * 255))),
          Math.min(255, Math.max(0, Math.round(g * 255))),
          Math.min(255, Math.max(0, Math.round(b * 255)))
        );
      }
    }
  }

  if (size === 0 || tableValues.length !== size * size * size * 3) {
    console.error('[LUT] Invalid .cube LUT format or mismatched size.');
    return false;
  }

  customLutSize = size;
  customLutData = new Uint8Array(tableValues);
  customLutName = filename;

  // Save to localStorage for persistence across reloads
  saveLutToStorage(filename, fileText);

  console.log(`[LUT] Successfully loaded .cube 3D LUT "${filename}" (Size: ${size}x${size}x${size})`);
  return true;
}

/**
 * Save custom LUT to localStorage
 */
export function saveLutToStorage(filename, fileText) {
  try {
    const payload = JSON.stringify({ name: filename, text: fileText });
    localStorage.setItem('8fps_custom_lut', payload);
    return true;
  } catch (e) {
    console.warn('[LUT] Storage quota exceeded or disabled (File active for current session only):', e);
    return false;
  }
}

/**
 * Load saved custom LUT from localStorage on app startup
 */
export function loadSavedLutFromStorage() {
  try {
    const saved = localStorage.getItem('8fps_custom_lut');
    if (!saved) return false;
    const { name, text } = JSON.parse(saved);
    if (text) {
      return parseCubeLut(text, name);
    }
  } catch (e) {
    console.warn('[LUT] Failed to load saved LUT from storage:', e);
  }
  return false;
}

/**
 * Fast 3D LUT Pixel Color Transformation for ImageData
 */
export function apply3dLutToImageData(imageData) {
  if (!customLutData || customLutSize === 0) return;

  const data = imageData.data;
  const size = customLutSize;
  const sizeSq = size * size;
  const lut = customLutData;
  const maxIdx = size - 1;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Map 0-255 RGB channels to LUT 3D grid coordinates
    const rIdx = Math.round((r / 255) * maxIdx);
    const gIdx = Math.round((g / 255) * maxIdx);
    const bIdx = Math.round((b / 255) * maxIdx);

    // .cube 3D indexing: index = (r + g * size + b * size * size) * 3
    const lutIdx = (rIdx + gIdx * size + bIdx * sizeSq) * 3;

    data[i]     = lut[lutIdx];
    data[i + 1] = lut[lutIdx + 1];
    data[i + 2] = lut[lutIdx + 2];
  }
}

/**
 * Async file reader wrapper — reads a .cube File and calls parseCubeLut
 */
export function uploadLutFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const success = parseCubeLut(e.target.result, file.name);
      resolve(success);
    };
    reader.onerror = () => resolve(false);
    reader.readAsText(file);
  });
}
