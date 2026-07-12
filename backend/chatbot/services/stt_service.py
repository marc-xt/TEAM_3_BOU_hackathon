"""
Speech-to-text, routed by language:

- English / Kiswahili: faster-whisper ("small" multilingual model) -- free, local,
  fast, well-supported for both languages.
- Luganda (beta): Whisper does not include Luganda in its training data at all, so it
  is not used here. Instead we route to Meta's MMS ("Massively Multilingual Speech")
  project, which has an actual Luganda-specific checkpoint. Quality will still be
  noticeably rougher than English/Kiswahili -- Luganda is low-resource everywhere --
  which is why this path is labelled "beta" end-to-end (model, UI, and API response).

Install:
  pip install faster-whisper
  pip install torch transformers librosa  (for the MMS Luganda path)

MMS model used: facebook/mms-1b-all (~1.2GB download, first call will be slow while it
downloads and caches). This is noticeably heavier than Whisper "small" -- expect slower
inference on CPU. If Luganda usage is low-volume, this is an acceptable trade-off for a
free/local setup; if it becomes a primary path, consider a GPU-backed inference server.
"""
from faster_whisper import WhisperModel

_whisper_model = None
_mms_processor = None
_mms_model = None


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
    return _whisper_model


def _get_mms_model():
    """Lazy-loaded so English/Swahili-only deployments never pay this cost."""
    global _mms_processor, _mms_model
    if _mms_model is None:
        from transformers import Wav2Vec2ForCTC, AutoProcessor

        model_id = "facebook/mms-1b-all"
        _mms_processor = AutoProcessor.from_pretrained(model_id, target_lang="lug")
        _mms_model = Wav2Vec2ForCTC.from_pretrained(model_id, target_lang="lug", ignore_mismatched_sizes=True)
        _mms_model.load_adapter("lug")
    return _mms_processor, _mms_model


def _transcribe_luganda(audio_path: str) -> str:
    import torch
    import librosa

    processor, model = _get_mms_model()
    speech, _sr = librosa.load(audio_path, sr=16000)
    inputs = processor(speech, sampling_rate=16000, return_tensors="pt")

    with torch.no_grad():
        logits = model(**inputs).logits

    ids = torch.argmax(logits, dim=-1)[0]
    return processor.decode(ids).strip()


def transcribe_audio(audio_path: str, language: str = None) -> str:
    """
    language: "en", "sw", or "lg". Pass None to let Whisper auto-detect (English/Swahili
    only -- auto-detection is skipped for Luganda since Whisper cannot recognise it).
    """
    if language == "lg":
        return _transcribe_luganda(audio_path)

    model = _get_whisper_model()
    segments, _info = model.transcribe(audio_path, language=language, beam_size=5)
    return " ".join(segment.text.strip() for segment in segments).strip()
