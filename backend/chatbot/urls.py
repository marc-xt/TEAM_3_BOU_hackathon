from django.urls import path
from .views import ChatTextView, ChatVoiceView, ChatHistoryView

urlpatterns = [
    path("message/", ChatTextView.as_view(), name="chatbot-message"),
    path("voice/", ChatVoiceView.as_view(), name="chatbot-voice"),
    path("history/<uuid:conversation_id>/", ChatHistoryView.as_view(), name="chatbot-history"),
]