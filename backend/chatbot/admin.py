from django.contrib import admin
from .models import ChatConversation, ChatMessage


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ["role", "content", "was_voice", "flag", "created_at"]


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "language", "consented", "created_at", "updated_at"]
    list_filter = ["language", "consented"]
    inlines = [ChatMessageInline]