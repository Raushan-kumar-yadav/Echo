
import sys
import os
from pathlib import Path
from PyInstaller.utils.hooks import copy_metadata as _cm, collect_all

ROOT = Path(SPECPATH)
block_cipher = None


def safe_meta(*packages):
    """copy_metadata() for every package — silently skip ones not installed."""
    result = []
    for pkg in packages:
        try:
            result += _cm(pkg)
        except Exception as _e:
            print(f"[spec] metadata not found for '{pkg}': {_e}")
    return result


def safe_collect(pkg):
    """collect_all() — returns (datas, binaries, hiddenimports), empty on failure."""
    try:
        return collect_all(pkg)
    except Exception as _e:
        print(f"[spec] collect_all failed for '{pkg}': {_e}")
        return [], [], []


_metadata_datas = safe_meta(
    # HTTP clients that call importlib.metadata.version() in __init__
    'httpx', 'httpx2', 'httpcore',
    # LangChain ecosystem
    'langchain_core', 'langchain_text_splitters',
    'langchain_ollama', 'langchain_openai', 'langchain_google_genai',
    'langchain_anthropic', 'langchain_groq', 'langchain_community',
    # LangGraph
    'langgraph', 'langgraph_checkpoint',
    # Ollama Python client
    'ollama',
    # Vector DB
    'chromadb',
    # Web framework
    'fastapi', 'starlette', 'uvicorn', 'pydantic',
    # Misc packages that read their own version at import
    'aiofiles', 'anyio', 'sniffio',
    # Whisper
    'faster_whisper', 'openai-whisper',
)

# collect_all() is the canonical PyInstaller way to handle packages that use
# dynamic imports (importlib.import_module). It recursively collects:
#   - ALL submodules as hiddenimports (catches lazy/dynamic imports)
#   - ALL data files (SQL schemas, JSON files, etc.)
#   - ALL binaries (.pyd/.dll extensions)
# chromadb 1.5+ loads its entire backend via dynamic dispatch in config.py,
# so static analysis misses most of it. collect_all solves this in one shot.
_chroma_d, _chroma_b, _chroma_h   = safe_collect('chromadb')
# chromadb_rust_bindings is the Rust backend extension (~62 MB .pyd).
# It's imported via `import chromadb_rust_bindings` inside chromadb/api/rust.py.
_rust_d,   _rust_b,   _rust_h     = safe_collect('chromadb_rust_bindings')
# faster-whisper + its C extension (ctranslate2) + openai-whisper fallback
_fw_d,     _fw_b,     _fw_h       = safe_collect('faster_whisper')
_ct2_d,    _ct2_b,    _ct2_h      = safe_collect('ctranslate2')
_ow_d,     _ow_b,     _ow_h       = safe_collect('whisper')

a = Analysis(
    [str(ROOT / 'backend' / 'main.py')],
    pathex=[str(ROOT)],
    binaries=[
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'onnxruntime' / 'capi' / 'onnxruntime.dll'), '.'),
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'onnxruntime' / 'capi' / 'onnxruntime_providers_shared.dll'), '.'),
    ] + _chroma_b + _rust_b + _fw_b + _ct2_b + _ow_b,
    datas=[
        (str(ROOT / 'backend'),   'backend'),
        (str(ROOT / 'templates'), 'templates'),
        (str(ROOT / 'backend' / 'timeline' / 'effects' / 'sksl'), 'backend/timeline/effects/sksl'),
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'kokoro_onnx'), 'kokoro_onnx'),
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'espeakng_loader'), 'espeakng_loader'),
        # jsonschema_specifications ships JSON schemas loaded at import time
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'jsonschema_specifications' / 'schemas'),
         'jsonschema_specifications/schemas'),
    ] + _metadata_datas + _chroma_d + _rust_d + _fw_d + _ct2_d + _ow_d,
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
        # VideoSemantic modules are lazy-imported inside worker functions
        'backend.ai.VideoSemantic.indexer',
        'backend.ai.VideoSemantic.descriptions',
        'backend.ai.VideoSemantic.frameExtractor',
        'backend.ai.VideoSemantic.merger',
        'av',
        'aiofiles',
        'dotenv',
    ] + _chroma_h + _rust_h,
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
