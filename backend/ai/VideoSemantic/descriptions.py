import os
import base64
import re
from pathlib import Path


_MODEL_PRIORITY = ["moondream:latest", "moondream", "moondream2", "llava", "llava-phi3"]

VISION_PROMPT = (
    "Directly describe this video frame in 2 sentences. "
    "Do NOT write introductions, headers, bold text, or bullet points. "
    "Just output plain text. Cover: "
    "(1) what subjects are doing, "
    "(2) the scene/environment, "
    "(3) camera angle and mood."
)


# ── Provider resolution ────────────────────────────────────────────────────────

def _get_provider_config() -> tuple[str, str, str]:
    """
    Returns (provider, model, api_key).
    provider: 'ollama' | 'gemini'
    """
    from backend.config.global_config import cfg
    provider = cfg.get("ai.index_provider", "ollama")

    if provider == "gemini":
        api_key = os.environ.get("GOOGLE_API_KEY", "").strip()
        model   = cfg.get("ai.index_gemini_model", "gemini-1.5-flash")
        return "gemini", model, api_key

    # Ollama
    chosen = cfg.get("ai.vision_model", "moondream:latest")
    try:
        import ollama
        models = [m.model for m in ollama.list().models]
        print(f"[VideoSemantic] Ollama models available: {models}", flush=True)
        if chosen in models:
            print(f"[VideoSemantic] Using Ollama model: {chosen}", flush=True)
            return "ollama", chosen, ""
        print(f"[VideoSemantic] Configured model {chosen!r} not found, trying fallbacks…", flush=True)
        for preferred in _MODEL_PRIORITY:
            if preferred in models:
                print(f"[VideoSemantic] Falling back to: {preferred}", flush=True)
                return "ollama", preferred, ""
        if models:
            print(f"[VideoSemantic] Using first available: {models[0]}", flush=True)
            return "ollama", models[0], ""
    except Exception as e:
        print(f"[VideoSemantic] Could not list Ollama models: {e}", flush=True)

    return "ollama", chosen, ""


def _get_model(override: str | None = None) -> str:
    """Legacy helper — returns model name for Ollama (used by old callers)."""
    _, model, _ = _get_provider_config()
    return override or model


# ── Frame description ──────────────────────────────────────────────────────────

def _describe_frame_ollama(frame_path: str, model: str) -> str:
    """Describe a frame using Ollama vision model."""
    import ollama
    with open(frame_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    response = ollama.chat(
        model=model,
        messages=[{
            "role": "user",
            "content": VISION_PROMPT,
            "images": [img_b64],
        }],
    )
    msg = response.message if hasattr(response, "message") else response["message"]
    content = msg.content if hasattr(msg, "content") else msg["content"]
    return content.strip()


def _describe_frame_gemini(frame_path: str, model: str, api_key: str) -> str:
    """Describe a frame using Google Gemini vision API — no Ollama/GPU needed."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError(
            "google-generativeai is not installed.\n"
            "Run: pip install google-generativeai"
        )
    if not api_key:
        raise RuntimeError(
            "GOOGLE_API_KEY is not set. "
            "Add it in Settings → API Keys or Indexing."
        )

    import PIL.Image
    genai.configure(api_key=api_key)
    gm = genai.GenerativeModel(model)
    img = PIL.Image.open(frame_path)
    response = gm.generate_content([VISION_PROMPT, img])
    return response.text.strip()


def describe_frame(
    frame_path: str,
    model: str,
    provider: str = "ollama",
    api_key: str = "",
) -> str:
    """
    Describe a single video frame.
    provider: 'ollama' (local) | 'gemini' (cloud, needs GOOGLE_API_KEY)
    """
    if provider == "gemini":
        return _describe_frame_gemini(frame_path, model, api_key)
    return _describe_frame_ollama(frame_path, model)


# ── Batch describe (used by old code paths) ────────────────────────────────────

def describe_all_frames(
    frames_dir: str,
    interval: float = 2.0,
    vision_model: str | None = None,
) -> list[dict]:
    frames_dir = Path(frames_dir)
    frame_files = sorted(frames_dir.glob("frame_*.jpg"))
    total = len(frame_files)

    provider, model, api_key = _get_provider_config()
    if vision_model:
        model = vision_model
    print(f"[VideoSemantic] Describing {total} frames — provider={provider} model={model}", flush=True)

    results: list[dict] = []
    for i, frame_file in enumerate(frame_files, 1):
        match = re.search(r"frame_(\d+)\.jpg$", frame_file.name)
        if not match:
            continue

        idx = int(match.group(1))   # 1-based
        start_sec = (idx - 1) * interval
        end_sec = idx * interval

        try:
            description = describe_frame(str(frame_file), model, provider=provider, api_key=api_key)
            print(f"[VideoSemantic] [{i}/{total}] t={start_sec:.0f}s → {description[:80]}...", flush=True)
        except Exception as e:
            description = ""
            print(f"[VideoSemantic] [{i}/{total}] vision FAILED for {frame_file.name}: {e}", flush=True)

        if description:
            results.append({
                "text":  description,
                "start": start_sec,
                "end":   end_sec,
            })

    print(f"[VideoSemantic] Described {len(results)}/{total} frames successfully", flush=True)
    return results
