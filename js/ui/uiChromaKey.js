/**
 * js/ui/uiChromaKey.js
 * Greenscreen & Virtual Background UI Controller
 */

import { state } from "../state.js";

export function bindChromaKeyEvents() {
  const toggleChromaKey = document.getElementById("toggleChromaKey");
  const chromaKeyControls = document.getElementById("chromaKeyControls");
  const chromaColorInput = document.getElementById("chromaColorInput");
  const presetGreenBtn = document.getElementById("presetGreenBtn");
  const presetBlueBtn = document.getElementById("presetBlueBtn");
  const chromaSimilaritySlider = document.getElementById(
    "chromaSimilaritySlider",
  );
  const chromaSmoothnessSlider = document.getElementById(
    "chromaSmoothnessSlider",
  );
  const chromaBgTypeSelect = document.getElementById("chromaBgTypeSelect");
  const chromaBgPresetWrapper = document.getElementById(
    "chromaBgPresetWrapper",
  );
  const chromaBgImageWrapper = document.getElementById("chromaBgImageWrapper");
  const uploadChromaBgBtn = document.getElementById("uploadChromaBgBtn");
  const chromaBgFileInput = document.getElementById("chromaBgFileInput");
  const chromaBgStatusInfo = document.getElementById("chromaBgStatusInfo");

  if (toggleChromaKey) {
    toggleChromaKey.addEventListener("change", () => {
      state.chromaKey.enabled = toggleChromaKey.checked;
      if (chromaKeyControls) {
        chromaKeyControls.style.display = state.chromaKey.enabled
          ? "block"
          : "none";
      }
    });
  }

  if (chromaColorInput) {
    chromaColorInput.addEventListener("input", () => {
      state.chromaKey.keyColor = chromaColorInput.value;
    });
  }

  if (presetGreenBtn) {
    presetGreenBtn.addEventListener("click", () => {
      state.chromaKey.keyColor = "#00ff00";
      if (chromaColorInput) chromaColorInput.value = "#00ff00";
    });
  }

  if (presetBlueBtn) {
    presetBlueBtn.addEventListener("click", () => {
      state.chromaKey.keyColor = "#0000ff";
      if (chromaColorInput) chromaColorInput.value = "#0000ff";
    });
  }

  if (chromaSimilaritySlider) {
    chromaSimilaritySlider.addEventListener("input", () => {
      state.chromaKey.similarity = parseInt(chromaSimilaritySlider.value, 10);
      const valEl = document.getElementById("chromaSimilarityVal");
      if (valEl) valEl.textContent = `${state.chromaKey.similarity}%`;
    });
  }

  if (chromaSmoothnessSlider) {
    chromaSmoothnessSlider.addEventListener("input", () => {
      state.chromaKey.smoothness = parseInt(chromaSmoothnessSlider.value, 10);
      const valEl = document.getElementById("chromaSmoothnessVal");
      if (valEl) valEl.textContent = `${state.chromaKey.smoothness}%`;
    });
  }

  if (chromaBgTypeSelect) {
    chromaBgTypeSelect.addEventListener("change", () => {
      state.chromaKey.bgType = chromaBgTypeSelect.value;
      if (chromaBgImageWrapper) {
        chromaBgImageWrapper.style.display =
          state.chromaKey.bgType === "image" ? "block" : "none";
      }
      if (chromaBgPresetWrapper) {
        chromaBgPresetWrapper.style.display =
          state.chromaKey.bgType === "preset" ? "block" : "none";
      }
      if (state.chromaKey.bgType === "preset" && !state.chromaKey.bgImage) {
        state.chromaKey.bgImage = generateVirtualBgImage("studio");
      }
    });
  }

  document.querySelectorAll(".bg-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetType = btn.getAttribute("data-bg-preset");
      state.chromaKey.bgType = "image";
      state.chromaKey.bgImage = generateVirtualBgImage(presetType);

      // Sync the select dropdown to 'image' mode
      if (chromaBgTypeSelect) chromaBgTypeSelect.value = "image";
      if (chromaBgImageWrapper) chromaBgImageWrapper.style.display = "block";
      if (chromaBgPresetWrapper) chromaBgPresetWrapper.style.display = "none";

      document
        .querySelectorAll(".bg-preset-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  if (uploadChromaBgBtn && chromaBgFileInput) {
    uploadChromaBgBtn.addEventListener("click", () =>
      chromaBgFileInput.click(),
    );

    chromaBgFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (chromaBgStatusInfo) {
        chromaBgStatusInfo.textContent = "Loading background...";
        chromaBgStatusInfo.style.color = "#06b6d4";
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          state.chromaKey.bgImage = img;
          if (chromaBgStatusInfo) {
            chromaBgStatusInfo.textContent = `✓ BG: ${file.name.slice(0, 20)}`;
            chromaBgStatusInfo.style.color = "#00ff66";
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
}

export function generateVirtualBgImage(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");

  if (type === "studio") {
    const grad = ctx.createRadialGradient(640, 360, 100, 640, 360, 700);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(0.6, "#0f172a");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    const cyanSpot = ctx.createRadialGradient(200, 200, 10, 200, 200, 350);
    cyanSpot.addColorStop(0, "rgba(6, 182, 212, 0.25)");
    cyanSpot.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = cyanSpot;
    ctx.fillRect(0, 0, 1280, 720);

    const magSpot = ctx.createRadialGradient(1080, 200, 10, 1080, 200, 350);
    magSpot.addColorStop(0, "rgba(217, 70, 239, 0.25)");
    magSpot.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = magSpot;
    ctx.fillRect(0, 0, 1280, 720);
  } else if (type === "cozy") {
    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, "#451a03");
    grad.addColorStop(0.5, "#78350f");
    grad.addColorStop(1, "#1c1917");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(245, 158, 11, ${0.05 + (i % 5) * 0.03})`;
      ctx.beginPath();
      ctx.arc(100 + i * 100, (i * 65) % 650, 60 + (i % 4) * 40, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === "cyber") {
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, "#090514");
    grad.addColorStop(0.7, "#2e1065");
    grad.addColorStop(1, "#581c87");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.fillStyle = "rgba(236, 72, 153, 0.4)";
    ctx.fillRect(0, 500, 1280, 4);

    ctx.strokeStyle = "rgba(217, 70, 239, 0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1280; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 500);
      ctx.lineTo(640 + (x - 640) * 3, 720);
      ctx.stroke();
    }
  } else if (type === "office") {
    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, "#334155");
    grad.addColorStop(0.6, "#1e293b");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(500, 0);
    ctx.lineTo(900, 720);
    ctx.lineTo(0, 720);
    ctx.fill();
  }

  const img = new Image();
  img.src = canvas.toDataURL("image/png");
  return img;
}
