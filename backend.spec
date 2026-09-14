# backend.spec  -  PyInstaller spec for Echo backend
# Run: .venv\Scripts\pyinstaller backend.spec --distpath pyinstaller-dist --clean

import sys
import os
from pathlib import Path

ROOT = Path(SPECPATH)
block_cipher = None

a = Analysis(
    [str(ROOT / 'backend' / 'main.py')],
    pathex=[str(ROOT)],
    binaries=[],
    datas=[
        (str(ROOT / 'backend'),   'backend'),
        (str(ROOT / 'templates'), 'templates'),
        (str(ROOT / 'backend' / 'timeline' / 'effects' / 'sksl'), 'backend/timeline/effects/sksl'),
        # kokoro_onnx needs its config.json bundled (TTS)
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'kokoro_onnx'), 'kokoro_onnx'),
    ],
    hiddenimports=[
        'uvicorn.lifespan.on',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.loops.auto',
        'fastapi',
        'fastapi.middleware.cors',
        'starlette.middleware.cors',
        'backend.routers.timeline',
        'backend.routers.render',
        'backend.routers.context',
        'backend.routers.project',
        'backend.routers.scene_tools',
        'backend.routers.jobs',
        'backend.routers.virality',
        'backend.routers.library',
        'backend.routers.playback',
        'backend.routers.clips',
        'backend.routers.comps',
        'backend.routers.effects',
        'backend.routers.transitions',
        'backend.routers.audio',
        'backend.routers.audio_tools',
        'backend.routers.animation',
        'backend.routers.export_',
        'backend.routers.search',
        'backend.routers.debug',
        'backend.ai.agent',
        'backend.ai.tools',
        'backend.ai.router',
        'backend.worker.worker_bus',
        'backend.worker.sandbox_worker',
        'langchain_openai',
        'langchain_google_genai',
        'langchain_anthropic',
        'langchain_groq',
        'langchain_ollama',
        'langgraph',
        'langgraph.graph',
        'langgraph.prebuilt',
        'chromadb',
        'av',
        'aiofiles',
        'dotenv',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=['torch','torchvision','torchaudio','tensorflow','sentence_transformers','matplotlib','tkinter','wx','PyQt5','PyQt6'],
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz, a.scripts, [],
    exclude_binaries=True,
    name='backend',
    debug=False,
    strip=False,
    upx=False,
    console=True,
)

coll = COLLECT(
    exe, a.binaries, a.zipfiles, a.datas,
    strip=False, upx=False,
    name='backend',
)
