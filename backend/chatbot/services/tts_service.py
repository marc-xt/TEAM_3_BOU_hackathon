"""
Text-to-speech, routed by language:

- English / Kiswahili: gTTS -- free, no API key, good quality for both.
- Luganda (beta): gTTS has no Luganda voice at all, so we route to Meta's MMS-TTS
  Luganda checkpoint instead (facebook/mms-tts-lug). This is a real synthesised voice
  rather than a silent failure, but -- like the STT and LLM paths -- expect rougher
  prosody than the English/Kiswahili voices. Keep this labelled "beta" in the UI.

Install:
  pip install gTTS
  pip install torch transformers scipy  (for the MMS Luganda path)

Output for both paths is written to MEDIA_ROOT/chat_audio/ and served via Django's
normal media URL. Wire up a periodic cleanup (management command or cron) to delete
files older than a few hours, per the "don't keep voice data longer than necessary"
requirement.
"""
import os
import uuid
from django.conf import settings
from gtts import gTTS

AUDIO_SUBDIR = "chat_audio"

_mms_tts_model = None
_mms_tts_tokenizer = None


def _get_mms_tts_model():
    global _mms_tts_model, _mms_tts_tokenizer
    if _mms_tts_model is None:
        from transformers import VitsModel, AutoTokenizer

        model_id = "facebook/mms-tts-lug"
        _mms_tts_model = VitsModel.from_pretrained(model_id)
        _mms_tts_tokenizer = AutoTokenizer.from_pretrained(model_id)
    return _mms_tts_tokenizer, _mms_tts_model


def _synthesize_luganda(text: str, filepath: str) -> None:
    import torch
    import scipy.io.wavfile

    tokenizer, model = _get_mms_tts_model()
    inputs = tokenizer(text, return_tensors="pt")

    with torch.no_grad():
        output = model(**inputs).waveform

    scipy.io.wavfile.write(
        filepath, rate=model.config.sampling_rate, data=output.squeeze().cpu().numpy()
    )


def synthesize_speech(text: str, language: str = "en") -> str:
    """Returns the public MEDIA_URL path to the generated audio file."""
    out_dir = os.path.join(settings.MEDIA_ROOT, AUDIO_SUBDIR)
    os.makedirs(out_dir, exist_ok=True)

    if language == "lg":
        filename = f"{uuid.uuid4()}.wav"
        filepath = os.path.join(out_dir, filename)
        _synthesize_luganda(text, filepath)
    else:
        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(out_dir, filename)
        tts = gTTS(text=text, lang=language if language in ("en", "sw") else "en")
        tts.save(filepath)

    return f"{settings.MEDIA_URL}{AUDIO_SUBDIR}/{filename}"