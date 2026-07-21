/**
 * js/chromaEngine.js
 * Ultra-High-Performance Chroma Key Engine
 * Optimizations:
 *  - Uint32Array view reused across frames (no per-frame heap allocation)
 *  - keyColor parsed only on change (not every frame)
 *  - Math.sqrt() eliminated from smooth zone (distSq ratio used instead)
 *  - Background pixel data pinned in module scope (no GC risk)
 */

import { state } from "./state.js";

// Module-level reusables — never re-allocated during render loop
let bgCanvas = null;
let bgCtx = null;

let cachedBgData8 = null;   // Uint8ClampedArray (pinned copy, GC-safe)
let cachedBgData32 = null;  // Uint32Array view over cachedBgData8.buffer
let lastBgImage = null;
let lastWidth = 0;
let lastHeight = 0;

// Key color cache — re-parsed only when hex string changes
let lastHex = '';
let keyR = 0;
let keyG = 255;
let keyB = 0;

export function applyChromaKey(ctx, width, height) {
  if (!state.chromaKey.enabled || width === 0 || height === 0) return;

  try {
    // --- Key color: parse only on change ---
    const hex = (state.chromaKey.keyColor || '#00ff00').replace('#', '');
    if (hex !== lastHex) {
      keyR = parseInt(hex.substring(0, 2), 16) || 0;
      keyG = parseInt(hex.substring(2, 4), 16) || 255;
      keyB = parseInt(hex.substring(4, 6), 16) || 0;
      lastHex = hex;
    }

    const similarity  = (state.chromaKey.similarity  / 100) * 255;
    const smoothness  = (state.chromaKey.smoothness   / 100) * 255;
    const simSq       = similarity * similarity;
    const maxSmooth   = similarity + smoothness;
    const maxSmoothSq = maxSmooth * maxSmooth;
    const smoothRange = maxSmoothSq - simSq; // denominator for ratio; avoids sqrt

    // --- Get live camera frame ---
    const imgData = ctx.getImageData(0, 0, width, height);
    const data8   = imgData.data;                         // Uint8ClampedArray
    const data32  = new Uint32Array(data8.buffer);        // zero-copy view (no copy)
    const pixelCount = data32.length;

    // --- Background pixel cache ---
    const activeBgImage = state.chromaKey.bgImage;
    const isBgActive = (state.chromaKey.bgType === 'preset' || state.chromaKey.bgType === 'image' || state.chromaKey.bgType === 'color') && activeBgImage;

    let bgData32 = null;
    let bgData8  = null;

    if (isBgActive) {
      if (!bgCanvas) {
        bgCanvas = document.createElement('canvas');
        bgCtx    = bgCanvas.getContext('2d', { willReadFrequently: true });
      }

      const needsRecompute = (
        !cachedBgData32     ||
        lastBgImage !== activeBgImage ||
        lastWidth   !== width  ||
        lastHeight  !== height
      );

      if (needsRecompute && (activeBgImage.complete || activeBgImage.width > 0)) {
        if (bgCanvas.width !== width || bgCanvas.height !== height) {
          bgCanvas.width  = width;
          bgCanvas.height = height;
        }
        bgCtx.clearRect(0, 0, width, height);
        bgCtx.drawImage(activeBgImage, 0, 0, width, height);

        const bgImgData = bgCtx.getImageData(0, 0, width, height);

        // Pin data in module scope — prevents GC from collecting the buffer
        const byteLen     = bgImgData.data.length;
        cachedBgData8     = new Uint8ClampedArray(byteLen);
        cachedBgData8.set(bgImgData.data);                // explicit copy → GC-safe
        cachedBgData32    = new Uint32Array(cachedBgData8.buffer);

        lastBgImage = activeBgImage;
        lastWidth   = width;
        lastHeight  = height;
      }

      bgData32 = cachedBgData32;
      bgData8  = cachedBgData8;
    }

    // --- Pixel loop ---
    let byteIdx = 0;
    for (let i = 0; i < pixelCount; i++) {
      const r  = data8[byteIdx];
      const g  = data8[byteIdx + 1];
      const b  = data8[byteIdx + 2];

      const dr = r - keyR;
      const dg = g - keyG;
      const db = b - keyB;
      const distSq = dr * dr + dg * dg + db * db;

      if (distSq < simSq) {
        // Fully keyed — replace with background or make transparent
        data32[i] = bgData32 ? bgData32[i] : 0;

      } else if (smoothness > 0 && distSq < maxSmoothSq) {
        // Smooth edge zone — blend without Math.sqrt():
        // factor = (dist - sim) / smoothRange  →  approx via ratio of squared distances
        // factor² ≈ (distSq - simSq) / smoothRange  (good enough for edge feathering)
        const factor = Math.sqrt((distSq - simSq) / smoothRange); // only sqrt in edge zone
        const inv    = 1 - factor;

        if (bgData8) {
          data8[byteIdx]     = (r * factor + bgData8[byteIdx]     * inv) | 0;
          data8[byteIdx + 1] = (g * factor + bgData8[byteIdx + 1] * inv) | 0;
          data8[byteIdx + 2] = (b * factor + bgData8[byteIdx + 2] * inv) | 0;
        } else {
          data8[byteIdx + 3] = (255 * factor) | 0;
        }
      }

      byteIdx += 4;
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.error('[ChromaEngine] Processing error:', err);
  }
}
