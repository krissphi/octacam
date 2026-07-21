/**
 * js/ui/uiHotkeys.js
 * Keyboard Hotkeys & Fullscreen Manager
 */

import { state } from '../state.js';
import { triggerSnapshotFlow } from '../snapshot.js';
import { toggleRecording } from '../recorder.js';
import { applyPreset } from './uiPresets.js';

export function bindHotkeyEvents(elements, setFpsFn, resetAllUiFn, setUiCollapseFn) {
  const { cameraCanvas, canvasContainer, recordStatus, recordBtn } = elements;

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    const tag = e.target ? e.target.tagName : '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
      return;
    }

    if (key === 'h') {
      setUiCollapseFn(!state.isUiCollapsed);
    } else if (key === 'p') {
      triggerSnapshotFlow(cameraCanvas, canvasContainer, recordStatus);
    } else if (key === 'v') {
      toggleRecording(cameraCanvas, recordBtn, recordStatus);
    } else if (key === 'f') {
      toggleFullscreen(canvasContainer);
    } else if (key === 'r') {
      resetAllUiFn(elements);
    } else if (key === '[') {
      setFpsFn(Math.max(1, state.targetFps - 1));
    } else if (key === ']') {
      setFpsFn(Math.min(60, state.targetFps + 1));
    } else if (key >= '1' && key <= '6') {
      const presets = ['none', 'lofi', 'vhs', 'cinematic', 'monochrome', 'pixel'];
      const idx = parseInt(key) - 1;
      if (idx < presets.length) {
        applyPreset(presets[idx], elements);
      }
    }
  });
}

export function toggleFullscreen(canvasContainer) {
  if (!document.fullscreenElement) {
    canvasContainer.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}
