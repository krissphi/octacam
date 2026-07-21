/**
 * js/chromaEngine.js
 * High-Performance Chroma Key Engine (Greenscreen & Background Replacement)
 */

import { state } from "./state.js";

let bgCanvas = null;
let bgCtx = null;

export function applyChromaKey(ctx, width, height) {
  if (!state.chromaKey.enabled || width === 0 || height === 0) return;

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const hex = (state.chromaKey.keyColor || "#00ff00").replace("#", "");
    const keyR = parseInt(hex.substring(0, 2), 16) || 0;
    const keyG = parseInt(hex.substring(2, 4), 16) || 255;
    const keyB = parseInt(hex.substring(4, 6), 16) || 0;

    const similarity = (state.chromaKey.similarity / 100) * 255;
    const smoothness = (state.chromaKey.smoothness / 100) * 255;

    let bgData = null;
    if (
      state.chromaKey.bgType === "image" &&
      state.chromaKey.bgImage &&
      state.chromaKey.bgImage.complete
    ) {
      if (!bgCanvas) {
        bgCanvas = document.createElement("canvas");
        bgCtx = bgCanvas.getContext("2d", { willReadFrequently: true });
      }
      if (bgCanvas.width !== width || bgCanvas.height !== height) {
        bgCanvas.width = width;
        bgCanvas.height = height;
      }
      bgCtx.drawImage(state.chromaKey.bgImage, 0, 0, width, height);
      bgData = bgCtx.getImageData(0, 0, width, height).data;
    }

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dist = Math.sqrt(
        (r - keyR) * (r - keyR) +
          (g - keyG) * (g - keyG) +
          (b - keyB) * (b - keyB),
      );

      if (dist < similarity) {
        if (smoothness > 0 && dist > similarity - smoothness) {
          const factor = (dist - (similarity - smoothness)) / smoothness;
          if (bgData) {
            data[i] = Math.round(r * factor + bgData[i] * (1 - factor));
            data[i + 1] = Math.round(g * factor + bgData[i + 1] * (1 - factor));
            data[i + 2] = Math.round(b * factor + bgData[i + 2] * (1 - factor));
          } else {
            data[i + 3] = Math.round(factor * 255);
          }
        } else {
          if (bgData) {
            data[i] = bgData[i];
            data[i + 1] = bgData[i + 1];
            data[i + 2] = bgData[i + 2];
            data[i + 3] = bgData[i + 3];
          } else {
            data[i + 3] = 0;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    console.warn("[ChromaKey] Processing error:", e);
  }
}
