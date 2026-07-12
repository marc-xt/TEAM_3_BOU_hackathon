"""
API surface for the chatbot app.

POST /api/chatbot/message/                     -> text-to-text turn
POST /api/chatbot/voice/                        -> speech-to-speech turn (multipart audio upload)
GET  /api/chatbot/history/<conversation_id>/    -> replay a conversation
"""
import os
import tempfile

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from .models import ChatConversation, ChatMessage
from .serializers import ChatConversationSerializer
from .financial_context import get_borrower_snapshot
from .services.llm_service import get_chat_reply
from .services.stt_service import transcribe_audio
from .services.tts_service import synthesize_speech

MAX_HISTORY_TURNS = 12  # keep the LLM context small and the demo fast


def _get_or_create_conversation(user, conversation_id, language):
    if conversation_id:
        conversation = ChatConversation.objects.filter(id=conversation_id, user=user).first()
        if conversation:
            return conversation
    return ChatConversation.objects.create(user=user, language=language)


def _build_history(conversation):
    recent = list(conversation.messages.order_by("-created_at")[:MAX_HISTORY_TURNS])
    recent.reverse()
    return [{"role": m.role, "content": m.content} for m in recent]


def _flag_from_snapshot(snapshot):
    return snapshot.get("dti_band") or snapshot.get("stress_band")


class ChatTextView(APIView):
    """Text-to-text turn."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_text = (request.data.get("message") or "").strip()
        language = request.data.get("language", "en")
        conversation_id = request.data.get("conversation_id")

        if not user_text:
            return Response({"error": "message is required"}, status=400)

        conversation = _get_or_create_conversation(request.user, conversation_id, language)
        ChatMessage.objects.create(conversation=conversation, role="user", content=user_text)

        snapshot = get_borrower_snapshot(request.user)
        history = _build_history(conversation)
        reply_text = get_chat_reply(history, language, snapshot)

        ChatMessage.objects.create(
            conversation=conversation,
            role="assistant",
            content=reply_text,
            flag=_flag_from_snapshot(snapshot),
        )

        return Response(
            {
                "conversation_id": str(conversation.id),
                "reply": reply_text,
                "flag": _flag_from_snapshot(snapshot),
                "language_beta": language == "lg",
            }
        )


class ChatVoiceView(APIView):
    """Speech-to-speech turn: upload audio, get back transcript + spoken reply."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        audio_file = request.FILES.get("audio")
        language = request.data.get("language", "en")
        conversation_id = request.data.get("conversation_id")

        if not audio_file:
            return Response({"error": "audio file is required"}, status=400)

        # Whisper needs a real file path; write the upload to a temp file first.
        suffix = os.path.splitext(audio_file.name)[1] or ".wav"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in audio_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            transcript = transcribe_audio(tmp_path, language=language)
        finally:
            os.remove(tmp_path)

        if not transcript:
            return Response({"error": "Could not understand the audio. Please try again."}, status=422)

        conversation = _get_or_create_conversation(request.user, conversation_id, language)
        ChatMessage.objects.create(conversation=conversation, role="user", content=transcript, was_voice=True)

        snapshot = get_borrower_snapshot(request.user)
        history = _build_history(conversation)
        reply_text = get_chat_reply(history, language, snapshot)

        ChatMessage.objects.create(
            conversation=conversation,
            role="assistant",
            content=reply_text,
            was_voice=True,
            flag=_flag_from_snapshot(snapshot),
        )

        reply_audio_url = synthesize_speech(reply_text, language)

        return Response(
            {
                "conversation_id": str(conversation.id),
                "transcript": transcript,
                "reply_text": reply_text,
                "reply_audio_url": reply_audio_url,
                "flag": _flag_from_snapshot(snapshot),
                "language_beta": language == "lg",
            }
        )


class ChatHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        conversation = ChatConversation.objects.filter(id=conversation_id, user=request.user).first()
        if not conversation:
            return Response({"error": "Conversation not found"}, status=404)
        return Response(ChatConversationSerializer(conversation).data)
