
import sys
import os
from pathlib import Path
from PyInstaller.utils.hooks import copy_metadata as _cm

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
)

a = Analysis(
    [str(ROOT / 'backend' / 'main.py')],
    pathex=[str(ROOT)],
    binaries=[
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'onnxruntime' / 'capi' / 'onnxruntime.dll'), '.'),
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'onnxruntime' / 'capi' / 'onnxruntime_providers_shared.dll'), '.'),
    ],
    datas=[
        (str(ROOT / 'backend'),   'backend'),
        (str(ROOT / 'templates'), 'templates'),
        (str(ROOT / 'backend' / 'timeline' / 'effects' / 'sksl'), 'backend/timeline/effects/sksl'),
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'kokoro_onnx'), 'kokoro_onnx'),
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'espeakng_loader'), 'espeakng_loader'),
        # jsonschema_specifications ships JSON schema files that jsonschema loads
        # at import time via pathlib.Path(__file__).parent / "schemas" — must be
        # bundled as data or chromadb's import chain crashes with FileNotFoundError.
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'jsonschema_specifications' / 'schemas'),
         'jsonschema_specifications/schemas'),
        # chromadb migrations (SQL files) and embedding_function JSON schemas
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'chromadb' / 'migrations'),
         'chromadb/migrations'),
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'chromadb' / 'utils' / 'embedding_functions' / 'schemas'),
         'chromadb/utils/embedding_functions/schemas'),
        # chromadb 1.5+ loads its backend via importlib.import_module() (dynamic import).
        # PyInstaller's static analysis misses chromadb.api.rust, chromadb.api.segment,
        # chromadb.segment.*, chromadb.db.*, chromadb.telemetry.* etc.
        # Bundling the whole package as data ensures filesystem fallback resolves them.
        # CHROMA_API_IMPL env var (in .env) forces the pure-Python segment backend
        # (avoids chromadb_rust_bindings.pyd which is not installed).
        (str(ROOT / '.venv' / 'Lib' / 'site-packages' / 'chromadb'), 'chromadb'),
    ] + _metadata_datas,
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
        'chromadb.telemetry.product.posthog',
        'chromadb.telemetry.product',
        'chromadb.telemetry',
        'av',
        'aiofiles',
        'dotenv',
        # VideoSemantic modules are lazy-imported inside worker functions;
        # static analysis misses them — pin them here so the archive always
        # has the latest compiled version.
        'backend.ai.VideoSemantic.indexer',
        'backend.ai.VideoSemantic.descriptions',
        'backend.ai.VideoSemantic.searcher',
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
