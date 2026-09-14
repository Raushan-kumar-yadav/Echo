# Echo — AI-Powered Video Editor 🎬✨

Echo is a next-generation, AI-first video editing platform that fuses traditional non-linear editing (NLE) with an intelligent **AI Director**. Built on a highly optimized stack of Electron, React, Python, and C++/Vulkan, Echo automates complex editing tasks, understands video semantics via vision models, and generates dynamic motion graphics on the fly.

![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![C++](https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)
![Vulkan](https://img.shields.io/badge/Vulkan-AA3322?style=for-the-badge&logo=Vulkan&logoColor=white)

---

## 🚀 Download & Run (No Installation Required)

> **Pre-built Windows x64 binary — just download and double-click.**

### 📦 [Download from Google Drive](https://drive.google.com/drive/folders/1ga8dbEF9xsMm5zsoMSc6cOVBdDtnOnT4?usp=sharing)

The Google Drive folder contains the complete `Echo-v1.0.0-win-x64.zip` distribution.

### Steps to run:

1. **Download** `Echo-v1.0.0-win-x64.zip` from the Google Drive link above
2. **Extract** the zip to any folder (e.g. `C:\Echo\`)
3. **Double-click** `Echo.exe` inside the extracted folder
4. The app will launch — no installation, no dependencies needed

> ⚠️ **Windows SmartScreen:** If Windows shows a security warning, click **"More info" → "Run anyway"**. The app is safe — it's just unsigned.

> 💡 All AI models (Kokoro TTS, Whisper) are bundled inside the zip. No internet required for core features.

---

## ✨ What's New in v1.0.0

### 🐛 Bug Fixes
- **UI now syncs in packaged build** — Fixed SSE race condition that caused clips to not appear/update after adding or deleting them in the built `.exe`
- **Audio plays from the correct clip** — Fixed audio track mismatch where the wrong clip's audio played under the playhead
- **Audio stops at clip end** — Audio no longer continues playing past the clip's end boundary
- **Seek while paused now works** — Scrubbing the timeline while paused correctly repositions audio on playback
- **Audio included in exported video** — Fixed FFmpeg binary path resolution in the packaged build that silently skipped audio muxing
- **AI agent no longer crashes on provider errors** — Added exponential-backoff retry on HTTP 500 upstream LLM errors
- **Web search fixed** — Updated to `ddgs` package with rate-limit retry and text-search fallback

---

## 🌟 Major Features

### 🤖 AI Director (LangGraph + LangChain)
The core of Echo is the AI Director — an intelligent agent running on a stateful graph (LangGraph). Instead of basic chat, the agent:
- Acts autonomously with access to dozens of timeline-manipulating tools (`split_clip`, `add_text_clip`, `apply_effect`, `add_transition`, and more).
- Reads live timeline state before making decisions, ensuring precise edits.
- Supports both local privacy-first models (Ollama: `llama3.2`, `gemma3`) and cloud LLMs (OpenAI, Gemini, TokenRouter).
- Automatically retries on transient API errors with exponential backoff.

### 🧠 Semantic Video Understanding
Echo doesn't just edit video — it *understands* it using a multi-modal AI pipeline:
- **Vision Indexing:** Extracts frames and runs local quantized vision models to describe scenes in natural language.
- **Whisper Speech-to-Text:** Generates highly accurate, timestamped transcripts from audio tracks (bundled `small.pt` model, 461 MB).
- **ChromaDB Vector Search:** Embeds descriptions and transcripts into a local vector database for semantic clip retrieval.

### 🎞️ GPU-Accelerated C++ Rendering Engine
- **Vulkan & Skia Compositor:** A custom-built C++ headless compositor powers the timeline preview and export.
- **N-API Integration:** Bridges the C++ engine directly into Node.js (Electron) for zero-network-overhead frame rendering.
- **Nested Compositions:** Supports After Effects-style nested timelines compiled into a DAG for efficient GPU processing.

### 🎙️ Local Generative Media & WebComps
- **Kokoro Offline TTS:** Ultra-fast, local Text-to-Speech generating realistic voiceovers entirely offline (bundled fp16 + int8 ONNX models).
- **Auto B-Roll (`yt-dlp`):** AI autonomously fetches b-roll from YouTube based on script context.
- **WebComps:** AI generates pure HTML/CSS/JS motion graphics rendered frame-by-frame directly onto the timeline.
- **Image Generation:** AI can generate images and import them directly into the library.
- **Web Search:** Built-in news/web search with rate-limit retry for script research.

### 🖥️ Professional, Dockable UI
- **React 18 + Vite:** Lightning-fast frontend with a premium glassmorphism aesthetic.
- **Dockable Workspaces:** Fully resizable panels — Home, AI, Video, Export.
- **Real-time SSE:** Server-Sent Events keep the UI perfectly synchronized with the AI's backend actions.
- **Text Animator:** Per-character/word/line animations (opacity, scale, translateY, etc.) with easing.
- **Transitions:** CrossDissolve, SlideLeft, Wipe, Zoom, Fade between clips.
- **SkSL Effects:** Shader-based effects (vignette, glow, chromatic aberration) applied per-clip.

### 🔊 Audio Engine
- **Multi-track audio** with per-clip volume control.
- **Synchronized seek** — audio repositions correctly when scrubbing the timeline.
- **Clip-bound playback** — audio stops exactly when the clip ends, not when the source file ends.
- **Export muxing** — all audio tracks mixed with correct timing via FFmpeg filter_complex.

---

## 🏗️ System Architecture

Echo uses a highly decoupled, multi-process architecture:

1. **Frontend / Desktop Shell (Electron + React):** Handles local filesystem access and renders the UI.
2. **Backend / Orchestrator (Python + FastAPI):** Manages the AI agent, tools, timeline state, and streaming responses.
3. **Sandbox Worker (WorkerBus):** Heavy AI tasks (Whisper, Vision, TTS) run in an isolated Python process with automatic watchdog recovery.
4. **Fast-path Thread Pools:** Lightweight tasks bypass the heavy worker queue to keep the timeline snappy.
5. **Command Pattern History:** All edits use a strict Command Pattern for flawless Undo/Redo.

---

## 🗺️ Project Structure

```text
Echo/
├── backend/               # Python FastAPI, AI Agent (LangGraph), ChromaDB, PyAV
│   ├── ai/                # Agent, tools, video pipeline, web search
│   ├── encoder/           # FFmpeg export / audio muxing
│   ├── rendering/         # Skia-based compositor nodes
│   └── routers/           # FastAPI route handlers
├── renderer/              # C++ Vulkan/Skia Headless Compositor (N-API bindings)
├── electron/              # Electron Main process & Preload scripts
├── src/                   # React Frontend (Workspaces, Components, API hooks)
│   └── workspaces/
│       └── viewport/      # Audio engine, WebComp sync, viewport widget
├── AIModels/              # Bundled AI models (Kokoro TTS, Whisper)
└── index.html             # Electron window template
```

---

## 🛠️ Development Setup

### Prerequisites
- Node.js v18+
- Python 3.10+
- FFmpeg on system PATH

### 1. Clone & install
```bash
git clone https://github.com/Raushan-kumar-yadav/Echo.git
cd Echo
npm install
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
```

### 2. Run in development mode
```bash
npm run dev
```

### 3. Build production `.exe`
```bash
# Bundle Python backend
pyinstaller backend.spec --distpath pyinstaller-dist --clean --noconfirm

# Build Vite + Electron
npm run build

# Package with electron-builder
npx electron-builder build --win --publish never
```

---

## 📝 License

This project is licensed under the **MIT License**.
