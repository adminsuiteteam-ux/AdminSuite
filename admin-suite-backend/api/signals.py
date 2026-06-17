import logging
import os
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Transaction, Notification
from .notifications import send_push_notification
from api.ai.services import call_gemini, ai_enabled

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Transaction)
def detect_transaction_anomaly(sender, instance, created, **kwargs):
    """
    Listens for new transactions and runs standard-deviation-based anomaly detection.
    If an anomaly is detected, queries Gemini for a friendly user explanation and creates a Notification.
    """
    if not created:
        return

    # Check if AI and anomaly detection are enabled
    ai_anomaly_enabled = os.environ.get('AI_ANOMALY_DETECTION', 'True').lower() == 'true'
    if not ai_enabled() or not ai_anomaly_enabled:
        return

    user = instance.user
    if not user:
        return

    category = instance.category
    tx_type = instance.type
    amount = float(instance.amount)

    # Fetch up to last 100 transactions in this category for context
    history = Transaction.objects.filter(
        user=user,
        category=category,
        type=tx_type
    ).exclude(pk=instance.pk).order_by('-id')[:100]

    amounts = [float(t.amount) for t in history]
    count = len(amounts)

    # Require at least 3 transactions to establish a baseline
    if count < 3:
        return

    # Python-based stats calculation to be database-agnostic (works on SQLite, Postgres, etc.)
    avg_val = sum(amounts) / count
    variance = sum((x - avg_val) ** 2 for x in amounts) / count
    std_val = variance ** 0.5

    # Determine if this transaction is anomalous
    # Threshold is average + 3 * standard deviation (or 3x average if standard deviation is negligible)
    threshold = avg_val + (3 * std_val) if std_val > (0.05 * avg_val) else 3 * avg_val
    
    is_anomaly = amount > threshold

    if not is_anomaly:
        return

    # Build prompt for Gemini
    prompt = f"""
You are AdminSuite AI. You have detected an unusual transaction in the business records.

New Transaction Details:
- Type: {tx_type.capitalize()}
- Category: {category}
- Description: {instance.description}
- Amount: ${amount:,.2f}
- Date: {instance.date}

Historical Context:
- Average amount in this category: ${avg_val:,.2f}
- Standard deviation: ${std_val:,.2f}
- Total historical transactions in category: {count}

Write a short, professional, and helpful warning message (under 30 words) for the business owner.
Explain why this transaction is flagged (e.g., "This expense is 4x higher than your average for Office Supplies") and ask a brief question to verify.
Do NOT use any formatting, markdown, or greetings. Keep it concise.
"""

    explanation = ""
    try:
        raw = call_gemini(prompt)
        if raw and not raw.startswith('__AI_'):
            explanation = raw.strip()
    except Exception as e:
        logger.error("Failed to generate AI anomaly description: %s", e)

    if not explanation:
        # Fallback to standard message
        explanation = f"Unusual {tx_type} of ${amount:,.2f} in '{category}' detected, which is significantly higher than your average of ${avg_val:,.2f}."

    # Create notification record in database
    Notification.objects.create(
        user=user,
        title="⚠️ Unusual Transaction Detected",
        body=explanation,
        time="Just now"
    )

    # Send push notification to the user
    try:
        send_push_notification(
            user=user,
            title="⚠️ Unusual Transaction Detected",
            body=explanation,
            data={
                "screen": "finance",
                "transactionId": instance.id
            }
        )
    except Exception as e:
        logger.error("Failed to send anomaly push notification: %s", e)
