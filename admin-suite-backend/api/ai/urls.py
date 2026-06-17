"""
AdminSuite AI URL Configuration
Routes for all /api/ai/... endpoints.
"""
from django.urls import path
from .views import (
    ai_chat,
    ai_finance_forecast,
    ai_employee_insights,
    ai_client_insights,
    ai_draft_client_email,
    ai_generate_report,
    ai_search,
    ai_chat_summary,
    ai_reply_suggestions,
    ai_status,
)

urlpatterns = [
    # Core AI assistant
    path('chat/', ai_chat, name='ai-chat'),

    # Finance intelligence
    path('finance-forecast/', ai_finance_forecast, name='ai-finance-forecast'),

    # Employee insights
    path('employee-insights/<int:employee_id>/', ai_employee_insights, name='ai-employee-insights'),

    # Client intelligence
    path('client-insights/', ai_client_insights, name='ai-client-insights'),
    path('draft-client-email/', ai_draft_client_email, name='ai-draft-client-email'),

    # Report generation
    path('generate-report/', ai_generate_report, name='ai-generate-report'),

    # Natural language search
    path('search/', ai_search, name='ai-search'),

    # Chat enhancements
    path('chat-summary/', ai_chat_summary, name='ai-chat-summary'),
    path('reply-suggestions/', ai_reply_suggestions, name='ai-reply-suggestions'),

    # Status / health
    path('status/', ai_status, name='ai-status'),
]
