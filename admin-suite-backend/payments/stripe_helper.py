import os
import stripe
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

# Initialize Stripe with secret key from environment
stripe.api_key = os.getenv('STRIPE_SECRET_KEY') or ''


def create_checkout_session(request, organization_id, plan):
    """Create a Stripe Checkout session for upgrading subscription.

    Args:
        request: Django request object (expects authenticated user).
        organization_id: ID of the Organization to upgrade.
        plan: String plan name ('PREMIUM' or 'PRO').

    Returns:
        JsonResponse with session ID or error.
    """
    try:
        # Determine the origin of the calling frontend
        origin = request.META.get('HTTP_ORIGIN')
        if not origin:
            referer = request.META.get('HTTP_REFERER')
            if referer:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"
        if not origin:
            origin = "http://localhost:5173"

        success_url = f"{origin}/?subscription=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/?subscription=cancel"

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'{plan.title()} Plan Subscription',
                    },
                    'unit_amount': 2500 if plan == 'PREMIUM' else 4500,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={'organization_id': str(organization_id), 'plan': plan},
        )
        return JsonResponse({'sessionId': session.id, 'url': session.url})
    except Exception:
        logging.exception('Error creating Stripe checkout session')
        return JsonResponse({'error': 'Unable to create checkout session'}, status=500)


@csrf_exempt
def stripe_webhook(request):
    """Handle Stripe webhook events for subscription updates.

    This endpoint must be registered in the project's URLconf.
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = os.getenv('STRIPE_WEBHOOK_SECRET') or ''

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except ValueError:
        # Invalid payload
        return JsonResponse({'error': 'Invalid payload'}, status=400)
    except Exception:
        # Invalid signature (stripe raises SignatureVerificationError here)
        return JsonResponse({'error': 'Invalid signature'}, status=400)

    # Handle completed checkout session
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        org_id = session['metadata'].get('organization_id')
        plan = session['metadata'].get('plan')

        from api.extended_models import Organization, Subscription
        from api.models import EmployeeActivityLog
        from api.notifications import send_push_notification
        
        try:
            org = Organization.objects.get(id=org_id)
            sub, _ = Subscription.objects.get_or_create(organization=org)
            sub.plan = plan
            
            # Set limit fields and dates
            if plan == 'BASIC':
                sub.max_records_per_field = 15
                sub.end_date = None
                sub.features = {}
            elif plan == 'PREMIUM':
                sub.max_records_per_field = 999999 # unlimited
                sub.end_date = (timezone.now() + timezone.timedelta(days=30)).date()
                sub.features = {'financial_management': False}
            elif plan in ('PRO', 'PRO_YEARLY'):
                sub.max_records_per_field = 999999 # unlimited
                days = 365 if plan == 'PRO_YEARLY' else 30
                sub.end_date = (timezone.now() + timezone.timedelta(days=days)).date()
                sub.features = {'financial_management': True, 'ai_automation': True}
                
            sub.save()

            # Log organization level activity
            EmployeeActivityLog.objects.create(
                employee=None, # system/organization level
                action="Subscription Upgraded",
                details=f"Upgraded organization subscription to {plan} plan via Stripe."
            )
            
            # Send push notification to the CEO/Admin user
            if org.created_by:
                send_push_notification(
                    user=org.created_by,
                    title='⚡ Subscription Upgraded!',
                    body=f"Your organization has successfully upgraded to the {plan} plan via Stripe.",
                    data={'screen': 'dashboard'}
                )
        except Exception:
            logging.exception(
                'Error processing Stripe webhook for organization %s', org_id
            )

    return JsonResponse({'status': 'success'})
