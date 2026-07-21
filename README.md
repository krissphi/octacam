# 📸 OctaCam — Lightweight Camera Utility for Content Creators

[![License: MIT](https://img.shields.io/badge/License-MIT-06b6d4.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-00ff66.svg)](manifest.json)
[![Creator: krissphi](https://img.shields.io/badge/Creator-krissphi-8b5cf6.svg)](https://krissphi.vercel.app)

> **OctaCam** is a high-performance, ultra-lightweight browser camera studio utility designed for content creators, live streamers, remote workers, and video enthusiasts. It provides instant hardware camera controls, real-time stop-motion FPS adjustments (1 FPS to 60 FPS), Adobe `.cube` 3D LUT color grading, virtual greenscreen chroma keying, and broadcast-ready audio enhancement.

---

## ✨ Key Features & Capabilities

### 🎥 Independent Camera Engine & Device Switching
- **Strict Negotiated Device Switching**: Instantly switch between laptop webcams, USB cameras, and OBS Virtual Cameras without stream locking.
- **Auto-Reconnect Hardware**: Dynamic detection and auto-reconnection when USB cameras are plugged or unplugged (`ondevicechange`).
- **Aspect Ratio Control**: Switch between `16:9` (Broadcast Widescreen), `4:3` (Retro TV), `1:1` (Square Avatar), and `9:16` (Vertical TikTok / Reels / Shorts).
- **Mirror Mode**: Instant horizontal camera feed flip.

### 🎙️ Broadcast Audio Pipeline & Visualizer
- **High-Fidelity Audio Capture**: Uncompressed microphone input with `echoCancellation: false` to eliminate browser audio gating and stuttering.
- **Real-Time Equalizer & VU Meter**: Web Audio API 8-bar FFT spectral frequency equalizer and real-time peak level VU indicator.
- **Vocal Enhancer DSP**: Built-in 80Hz Low-Cut Hum Filter + 2.8kHz Vocal Clarity Boost.
- **Headphone Sidetone Monitor**: Zero-latency headphone microphone monitoring with independent gain volume control.

### 🎨 Visual Effects, Presets & 3D LUT Engine
- **Adobe `.cube` 3D LUT Parser**: Load and apply custom 3D LUT color grading files with automatic `localStorage` persistence.
- **Virtual Background Chroma Key**: Key out green (#00ff00) or blue (#0000ff) screen backgrounds with 4 built-in virtual studio spaces (Studio, Cozy Loft, Neon Cyber, Office) or custom image uploads.
- **Aesthetic Filter Presets**: Instant one-click presets including **Normal**, **Lo-Fi**, **VHS**, **Cinematic**, **Monochrome B&W**, and **8-Bit Pixel Art**.
- **Retro CRT Overlays**: Adjustable Scanlines, Grain Noise pattern, Vignette shading, and Rounded Canvas Corners.
- **HUD OSD Overlay**: Retro camera watermark (`★ MADE WITH OCTACAM ★`), live timestamp, resolution, and REC dot indicator.

### 📸 Snapshot Gallery & Video Recorder
- **Floating Snapshot Drawer**: Capture high-resolution PNG photos to a floating thumbnail drawer at the bottom right.
- **3-Second Countdown Timer (3-2-1)**: Visual pulsating countdown overlay with Web Audio API beeps before photo capture.
- **VP9 + Opus Video Recorder**: Record WebM video files with dynamic bitrate scaling (1.5 Mbps to 4.0 Mbps) and 1-second corruption protection guard.

### 📱 Progressive Web App (PWA) & Offline Mode
- **Installable**: Install OctaCam as a native standalone app on Windows, macOS, Android, and iOS.
- **Offline Capable**: Full Service Worker static asset caching for offline usage without internet connection.
- **Auto-Persist Settings**: Automatically saves selected camera/mic, target FPS, aspect ratio, mirror status, and audio volume in `localStorage`.

---

## ⌨️ Keyboard Shortcuts Cheat Sheet

| Key | Action |
|---|---|
| <kbd>H</kbd> | Toggle Interface Visibility (Streamer / Clean Screen Mode) |
| <kbd>P</kbd> | Take Photo Snapshot (Triggers active Timer) |
| <kbd>V</kbd> | Start / Stop Video Recording |
| <kbd>F</kbd> | Toggle Fullscreen Mode |
| <kbd>R</kbd> | Reset All Settings to Default |
| <kbd>1</kbd> – <kbd>6</kbd> | Apply Aesthetic Presets (Normal, Lo-Fi, VHS, Cinematic, B&W, 8-Bit Pixel) |
| <kbd>[</kbd> and <kbd>]</kbd> | Decrease / Increase Target FPS |

---

## 🏗️ Clean Modular Architecture

OctaCam is built with **100% Native ES Modules** and **Modular CSS**, ensuring zero framework overhead and lightweight maintainability:

```
8frames/
├── favicon.svg             # Vector SVG App Favicon
├── index.html              # Main HTML Shell & Accessibility Landmark
├── manifest.json           # PWA Web App Manifest
├── style.css               # CSS Module Loader & Entry Point
├── sw.js                   # Service Worker Cache Engine
├── assets/
│   └── krissphi.png        # Creator Profile Avatar
├── css/
│   ├── base.css            # CSS Reset & Base Typography
│   ├── variables.css       # Design System Tokens & Colors
│   ├── components.css      # Buttons, Inputs, Cards & Overlays
│   ├── viewport.css        # Camera Canvas & Aspect Ratios
│   ├── sidebarDashboard.css# Control Sidebar Layout
│   ├── sidebarControls.css # Form Controls & Accordions
│   └── responsive.css      # Mobile, Tablet & Desktop Breakpoints
└── js/
    ├── main.js             # Application Bootstrapper
    ├── state.js            # Central State Manager & localStorage Engine
    ├── camera.js           # Camera Hardware & Stream Manager
    ├── audio.js            # Web Audio Pipeline, DSP & VU Visualizer
    ├── devices.js          # Device Enumeration Helper
    ├── renderer.js         # Canvas Dual-Cadence Render Loop
    ├── recorder.js         # WebM Video Recorder
    ├── snapshot.js         # Photo Capture & 3s Countdown Timer
    ├── chromaEngine.js     # Greenscreen Chroma Key Engine
    ├── lutParser.js        # Adobe .cube 3D LUT Parser
    ├── ui.js               # Master UI Event Controller
    └── ui/
        ├── uiPresets.js    # Filter & User Presets Manager
        ├── uiChromaKey.js  # Chroma Key UI Binding
        ├── uiHotkeys.js    # Keyboard Shortcuts Handler
        └── uiReset.js      # Global UI Reset Handler
```

---

## 🚀 Getting Started

### Running Locally
No build step or Node.js server required! Simply clone and open with any local HTTP server:

```bash
# Clone the repository
git clone https://github.com/krissphi/octacam.git
cd octacam

# Serve locally (using Python, Live Server, or npx serve)
npx serve .
```

Open `http://localhost:3000` in Google Chrome, Microsoft Edge, or Safari.

### Deploying to Production
OctaCam is static and ready to deploy instantly to any static hosting provider:

- **Vercel**: Import repository or run `npx vercel`
- **Netlify**: Drag and drop project directory or link git repository
- **GitHub Pages**: Push to `gh-pages` branch or configure GitHub Actions

---

## 👨‍💻 Creator & Support

Built with passion by **krissphi**, an independent developer dedicated to crafting lightweight, high-performance tools for creators and streamers.

- 🌐 **Portfolio & Website**: [krissphi.vercel.app](https://krissphi.vercel.app)
- 💖 **Support / Donate**: [sociabuzz.com/krissphi/support](https://sociabuzz.com/krissphi/support)
- ✉️ **Contact**: [krisna77pp@gmail.com](mailto:krisna77pp@gmail.com)

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute for personal or commercial projects.
