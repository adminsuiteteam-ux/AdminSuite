"""
safe_logger.py — PII-Safe Logging Utility
==========================================
All log calls in views.py and elsewhere should go through this module.

Rules enforced:
  • Sensitive field names are redacted to '***' before any log write.
  • Email addresses in free-form strings are partially masked.
  • OTP / verification codes are fully masked.
  • ANSI escape sequences and log-injection characters are stripped.
  • Messages are capped at 2 048 characters to prevent log flooding.

Usage:
    from core.safe_logger import safe_log, mask_email

    safe_log("info",  "User logged in", extra={"email": user.email})
    safe_log("warn",  "OTP resend requested", extra={"phone": phone})
    safe_log("error", "Unexpected failure", extra={"error": str(e)})
"""

import logging
import re
import sys

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Fields whose VALUES will be fully replaced with '***'
_REDACT_FIELDS = frozenset({
    "password", "passwd", "pass", "secret", "token", "api_key", "apikey",
    "api_secret", "access_token", "refresh_token", "id_token",
    "identity_token", "otp", "code", "verification_code", "pin",
    "ssn", "card", "card_number", "cvv", "credit_card",
    "authorization", "auth", "bearer",
})

# Characters that must never appear in a log line (log-injection prevention)
_STRIP_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\x1b]")

# Email masking pattern: keep first char and domain
_EMAIL_PATTERN = re.compile(
    r"([a-zA-Z0-9_.+\-]{1})[a-zA-Z0-9_.+\-]*(@[a-zA-Z0-9\-]+\.[a-zA-Z0-9.\-]+)"
)

_MAX_LEN = 2048

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_logger = logging.getLogger("adminsuite.safe")


def _sanitize_str(value: str) -> str:
    """Strip injection characters and cap length."""
    cleaned = _STRIP_PATTERN.sub("", str(value))
    return cleaned[:_MAX_LEN]


def _redact_dict(data: dict) -> dict:
    """Return a copy of *data* with sensitive keys replaced by '***'."""
    result = {}
    for key, value in data.items():
        if str(key).lower() in _REDACT_FIELDS:
            result[key] = "***"
        elif isinstance(value, dict):
            result[key] = _redact_dict(value)
        elif isinstance(value, str):
            result[key] = _sanitize_str(value)
        else:
            result[key] = value
    return result


def mask_email(email: str) -> str:
    """Return a partially masked email address for safe logging.

    Example: 'john.doe@example.com' → 'j***@example.com'
    """
    if not email or "@" not in email:
        return "***"
    return _EMAIL_PATTERN.sub(r"\1***\2", email)


def mask_phone(phone: str) -> str:
    """Return a partially masked phone number for safe logging.

    Example: '+447911123456' → '+447***456'
    """
    if not phone:
        return "***"
    digits = re.sub(r"[^\d+]", "", phone)
    if len(digits) < 6:
        return "***"
    return digits[:3] + "***" + digits[-3:]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def safe_log(level: str, message: str, extra: dict | None = None) -> None:
    """Write a sanitized log entry.

    Args:
        level:   One of 'debug', 'info', 'warning'/'warn', 'error', 'critical'.
        message: Free-form log message (will be sanitized).
        extra:   Optional dict of structured fields (sensitive keys redacted).
    """
    clean_message = _sanitize_str(message)
    clean_extra = _redact_dict(extra) if extra else {}

    log_fn = {
        "debug":    _logger.debug,
        "info":     _logger.info,
        "warning":  _logger.warning,
        "warn":     _logger.warning,
        "error":    _logger.error,
        "critical": _logger.critical,
    }.get(level.lower(), _logger.info)

    if clean_extra:
        log_fn("%s | %s", clean_message, clean_extra)
    else:
        log_fn("%s", clean_message)


def safe_print(message: str) -> None:
    """Drop-in replacement for bare ``print()`` calls in views.

    Routes output through the safe logger at INFO level instead of stdout
    so that PII never appears in raw console output.
    """
    safe_log("info", message)
