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
        domain = request.build_absolute_uri('/')
        success_url = f"{domain}subscription/success/?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{domain}subscription/cancel/"
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
            metadata={'organization_id': organization_id, 'plan': plan},
        )
        return JsonResponse({'sessionId': session.id})
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
        try:
            org = Organization.objects.get(id=org_id)
            sub, _ = Subscription.objects.get_or_create(organization=org)
            sub.plan = plan
            sub.start_date = timezone.now().date()
            sub.end_date = None  # indefinite for this demo
            sub.save()
        except Exception:
            logging.exception(
                'Error processing Stripe webhook for organization %s', org_id
            )
            # Continue; do not retry webhook on internal errors

    return JsonResponse({'status': 'success'})
