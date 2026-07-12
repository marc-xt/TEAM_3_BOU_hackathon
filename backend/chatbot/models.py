import uuid
from django.db import models
from django.contrib.auth.models import User


class ChatConversation(models.Model):
    """One conversation thread per borrower session. Kept short-lived per the
    privacy requirement: wire up a scheduled task (e.g. django-crontab or Celery
    beat) to delete conversations older than a retention window, using
    updated_at below."""

    LANGUAGE_CHOICES = [
        ("en", "English"),
        ("sw", "Kiswahili"),
        ("lg", "Luganda (beta)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chat_conversations")
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES, default="en")
    consented = models.BooleanField(default=False)  # user explicitly agreed chat may be logged
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]


class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
    ]

    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    # True for voice turns. The audio itself is never persisted long-term (see
    # services/tts_service.py) -- only this plain-text transcript/reply is stored.
    was_voice = models.BooleanField(default=False)
    flag = models.CharField(max_length=10, blank=True, null=True)  # "safe" | "caution" | "high"
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
