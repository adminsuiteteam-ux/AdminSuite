"""
AdminSuite AI Views
All AI-powered API endpoints. Every endpoint requires authentication.
"""

import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .services import (
    ai_enabled, call_gemini, parse_json_response,
    build_business_context, build_finance_detail,
    build_client_detail, build_employee_detail,
    translate_search_to_filters,
)
from .prompts import (
    SYSTEM_PERSONA,
    CHAT_PROMPT,
    FINANCE_FORECAST_PROMPT,
    EMPLOYEE_INSIGHT_PROMPT,
    CLIENT_INSIGHT_PROMPT,
    CLIENT_EMAIL_PROMPT,
    REPORT_PROMPT,
    SEARCH_PROMPT,
    CHAT_SUMMARY_PROMPT,
    REPLY_SUGGESTIONS_PROMPT,
)

logger = logging.getLogger(__name__)


def _ai_unavailable():
    return Response(
        {'error': 'AI features are not enabled. Set AI_ENABLED=True in your .env file.'},
        status=status.HTTP_503_SERVICE_UNAVAILABLE
    )


# ---------------------------------------------------------------------------
# 1. AI Business Assistant Chat
# POST /api/ai/chat/
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_chat(request):
    """
    Answer any business question using the user's real data.
    Body: { "message": "How much did I spend last month?" }
    """
    if not ai_enabled():
        return _ai_unavailable()

    message = request.data.get('message', '').strip()
    if not message:
        return Response({'error': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(message) > 500:
        return Response({'error': 'Message must be under 500 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        ctx = build_business_context(request.user)
    except Exception as e:
        logger.error("Failed to build business context: %s", e)
        return Response({'error': 'Failed to load business data.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    prompt = CHAT_PROMPT.format(
        system_persona=SYSTEM_PERSONA,
        user_message=message,
        **{k: v for k, v in ctx.items() if not k.startswith('_')}
    )

    raw = call_gemini(prompt)
    if raw.startswith('__AI_'):
        return Response({'error': 'AI service is temporarily unavailable. Please try again.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({'reply': raw})


# ---------------------------------------------------------------------------
# 2. Finance Forecast
# GET /api/ai/finance-forecast/
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_finance_forecast(request):
    """
    Generate a financial health score, assessment, and recommendations.
    """
    if not ai_enabled():
        return _ai_unavailable()

    try:
        ctx = build_business_context(request.user)
        finance_detail = build_finance_detail(ctx)
    except Exception as e:
        logger.error("Finance forecast context error: %s", e)
        return Response({'error': 'Failed to load financial data.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    prompt = FINANCE_FORECAST_PROMPT.format(
        system_persona=SYSTEM_PERSONA,
        total_income=ctx['total_income'],
        total_expense=ctx['total_expense'],
        net_profit=ctx['net_profit'],
        **finance_detail
    )

    raw = call_gemini(prompt)
    if raw.startswith('__AI_'):
        return Response({'error': 'AI service is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    result = parse_json_response(raw)
    return Response(result)


# ---------------------------------------------------------------------------
# 3. Employee Insights
# GET /api/ai/employee-insights/<int:employee_id>/
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_employee_insights(request, employee_id):
    """
    Generate an HR risk assessment and performance review draft for one employee.
    """
    if not ai_enabled():
        return _ai_unavailable()

    from api.models import Employee
    try:
        employee = Employee.objects.get(pk=employee_id, user=request.user)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    detail = build_employee_detail(employee)

    prompt = EMPLOYEE_INSIGHT_PROMPT.format(
        system_persona=SYSTEM_PERSONA,
        employee_name=employee.name,
        employee_role=employee.role,
        employee_department=employee.department,
        employee_status=employee.status,
        performance=employee.performance,
        is_flagged=employee.is_flagged,
        flag_reason=employee.flag_reason or 'None',
        **detail
    )

    raw = call_gemini(prompt)
    if raw.startswith('__AI_'):
        return Response({'error': 'AI service is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    result = parse_json_response(raw)
    return Response(result)


# ---------------------------------------------------------------------------
# 4. Client Insights
# GET /api/ai/client-insights/
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_client_insights(request):
    """
    Assess the health of all client relationships (healthy / at_risk / urgent).
    """
    if not ai_enabled():
        return _ai_unavailable()

    from api.models import Client
    clients = Client.objects.filter(user=request.user).prefetch_related('projects')

    if not clients.exists():
        return Response({'insights': [], 'summary': 'No clients found.'})

    clients_detail = build_client_detail(clients)

    prompt = CLIENT_INSIGHT_PROMPT.format(
        system_persona=SYSTEM_PERSONA,
        clients_detail=clients_detail
    )

    raw = call_gemini(prompt)
    if raw.startswith('__AI_'):
        return Response({'error': 'AI service is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    result = parse_json_response(raw)
    return Response(result)


# ---------------------------------------------------------------------------
# 5. Draft Client Email
# POST /api/ai/draft-client-email/
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_draft_client_email(request):
    """
    Generate a professional email for a specific client.
    Body: { "client_id": 5, "purpose": "payment reminder" }
    """
    if not ai_enabled():
        return _ai_unavailable()

    client_id = request.data.get('client_id')
    purpose = request.data.get('purpose', '').strip()

    if not client_id or not purpose:
        return Response({'error': 'client_id and purpose are required.'}, status=status.HTTP_400_BAD_REQUEST)

    from api.models import Client
    try:
        client = Client.objects.get(pk=client_id, user=request.user)
    except Client.DoesNotExist:
        return Response({'error': 'Client not found.'}, status=status.HTTP_404_NOT_FOUND)

    from api.models import UserProfile
    try:
        profile = request.user.profile
        business_name = profile.business_name or request.user.username
    except Exception:
        business_name = request.user.username

    pending_projects = client.projects.filter(status__in=['active', 'planned']).count()

    prompt = CLIENT_EMAIL_PROMPT.format(
        system_persona=SYSTEM_PERSONA,
        business_name=business_name,
        client_name=client.contact,
        client_company=client.company,
        email_purpose=purpose,
        client_status=client.status,
        amount_owed=f"{float(client.client_owes_company):,.2f}",
        pending_projects=pending_projects,
        remark=client.remark or 'None'
    )

    raw = call_gemini(prompt)
    if raw.startswith('__AI_'):
        return Response({'error': 'AI service is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    result = parse_json_response(raw)
    return Response(result)


# ---------------------------------------------------------------------------
# 6. AI Report Generation
# POST /api/ai/generate-report/
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_generate_report(request):
    """
    Generate a full executive business summary report.
    Body: { "period": "July 2026" }
    """
    if not ai_enabled():
        return _ai_unavailable()

    period = request.data.get('period', 'Current Period')

    try:
        ctx = build_business_context(request.user)
        finance_detail = build_finance_detail(ctx)
    except Exception as e:
        logger.error("Report context error: %s", e)
        return Response({'error': 'Failed to load business data.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    from api.models import UserProfile, PayrollStatus
    try:
        profile = request.user.profile
        business_name = profile.business_name or request.user.username
    except Exception:
        business_name = request.user.username

    # Top clients by paid amount
    top_clients_qs = ctx['_clients'].order_by('-paid')[:5]
    top_clients = '\n'.join([
        f"  - {c.company}: ${float(c.paid):,.2f} paid | {c.status}"
        for c in top_clients_qs
    ]) or '  (none)'

    # Payroll summary
    payroll = PayrollStatus.objects.filter(user=request.user)
    paid_months = payroll.filter(paid=True).count()
    total_months = payroll.count()
    payroll_summary = f"{paid_months}/{total_months} months paid" if total_months else "No payroll data"

    prompt = REPORT_PROMPT.format(
        system_persona=SYSTEM_PERSONA,
        period=period,
        business_name=business_name,
        total_income=ctx['total_income'],
        total_expense=ctx['total_expense'],
        net_profit=ctx['net_profit'],
        employee_count=ctx['employee_count'],
        active_projects=ctx['active_projects'],
        client_count=ctx['client_count'],
        budgets_detail=finance_detail['budgets_detail'],
        top_clients=top_clients,
        projects_summary=ctx['projects_summary'],
        payroll_summary=payroll_summary,
        debts_summary=ctx['debts_summary'],
    )

    raw = call_gemini(prompt)
    if raw.startswith('__AI_'):
        return Response({'error': 'AI service is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({'report': raw, 'period': period, 'business_name': business_name})


# ---------------------------------------------------------------------------
# 7. Natural Language Search
# POST /api/ai/search/
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_search(request):
    """
    Translate a plain-English query into filtered results.
    Body: { "query": "active employees in design department" }
    """
    if not ai_enabled():
        return _ai_unavailable()

    query = request.data.get('query', '').strip()
    if not query:
        return Response({'error': 'query is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(query) > 300:
        return Response({'error': 'Query must be under 300 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    prompt = SEARCH_PROMPT.format(query=query)
    raw = call_gemini(prompt)

    if raw.startswith('__AI_'):
        return Response({'error': 'AI service is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    parsed = parse_json_response(raw)
    if 'error' in parsed:
        return Response({'error': 'Could not interpret your search query.', 'results': []})

    model_name = parsed.get('model', 'employees')
    raw_filters = parsed.get('filters', {})
    interpreted_as = parsed.get('interpreted_as', query)

    # Sanitise filters — only whitelisted fields allowed
    safe_filters = translate_search_to_filters(model_name, raw_filters)

    from api.models import Employee, Client, Project, Transaction
    from api.serializers import (
        EmployeeSerializer, ClientSerializer,
        ProjectSerializer, TransactionSerializer
    )

    MODEL_MAP = {
        'employees': (Employee, EmployeeSerializer),
        'clients': (Client, ClientSerializer),
        'projects': (Project, ProjectSerializer),
        'transactions': (Transaction, TransactionSerializer),
    }

    if model_name not in MODEL_MAP:
        return Response({'error': f'Unknown model: {model_name}', 'results': []})

    Model, Serializer = MODEL_MAP[model_name]

    try:
        qs = Model.objects.filter(user=request.user, **safe_filters)[:50]
        data = Serializer(qs, many=True, context={'request': request}).data
    except Exception as e:
        logger.error("AI search filter error: %s", e)
        return Response({'error': 'Search filter failed.', 'results': []})

    return Response({
        'interpreted_as': interpreted_as,
        'model': model_name,
        'count': len(data),
        'results': data,
    })


# ---------------------------------------------------------------------------
# 8. Chat Summary
# POST /api/ai/chat-summary/
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_chat_summary(request):
    """
    Summarize team chat messages over a time period.
    Body: { "hours": 24 }
    """
    if not ai_enabled():
        return _ai_unavailable()

    hours = int(request.data.get('hours', 24))

    from api.models import ChatMessage
    from django.utils import timezone
    from datetime import timedelta

    since = timezone.now() - timedelta(hours=hours)
    messages = ChatMessage.objects.filter(
        company_user=request.user,
        created_at__gte=since,
        is_deleted=False
    ).order_by('created_at').select_related('sender')[:100]

    if not messages.exists():
        return Response({'summary_points': ['No messages found in this time period.'], 'action_items': []})

    msg_lines = [
        f"  [{m.created_at.strftime('%H:%M')}] {m.sender.first_name or m.sender.username}: {m.text[:200]}"
        for m in messages
    ]

    prompt = CHAT_SUMMARY_PROMPT.format(
        system_persona=SYSTEM_PERSONA,
        hours=hours,
        messages='\n'.join(msg_lines)
    )

    raw = call_gemini(prompt)
    if raw.startswith('__AI_'):
        return Response({'error': 'AI service is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    result = parse_json_response(raw)
    return Response(result)


# ---------------------------------------------------------------------------
# 9. Reply Suggestions
# POST /api/ai/reply-suggestions/
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_reply_suggestions(request):
    """
    Generate 3 short professional reply options for a message.
    Body: { "message": "Are you free for a quick call today?", "sender_name": "James" }
    """
    if not ai_enabled():
        return _ai_unavailable()

    message = request.data.get('message', '').strip()
    sender_name = request.data.get('sender_name', 'Team member')
    context = request.data.get('context', '')

    if not message:
        return Response({'error': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)

    prompt = REPLY_SUGGESTIONS_PROMPT.format(
        message=message[:300],
        sender_name=sender_name,
        context=context[:200] if context else 'No additional context.'
    )

    raw = call_gemini(prompt)
    if raw.startswith('__AI_'):
        return Response({'error': 'AI service is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    result = parse_json_response(raw)
    return Response(result)


# ---------------------------------------------------------------------------
# 10. AI Status / Health Check
# GET /api/ai/status/
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_status(request):
    """Returns the current AI feature configuration status."""
    import os
    api_key = os.environ.get('GEMINI_API_KEY', '')
    key_configured = bool(api_key and api_key != 'YOUR_GEMINI_API_KEY_HERE')

    return Response({
        'ai_enabled': ai_enabled(),
        'key_configured': key_configured,
        'model': 'gemini-2.0-flash',
        'features': {
            'chat': ai_enabled(),
            'finance_forecast': ai_enabled(),
            'employee_insights': ai_enabled(),
            'client_insights': ai_enabled(),
            'search': ai_enabled(),
            'report_generation': ai_enabled(),
            'chat_summary': ai_enabled(),
            'reply_suggestions': ai_enabled(),
        }
    })
