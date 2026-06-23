import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class ComplexPasswordValidator:
    def validate(self, password, user=None):
        if len(password) < 8:
            raise ValidationError(
                _("Password must be at least 8 characters long."),
                code='password_too_short',
            )
        if not any(char.isupper() for char in password):
            raise ValidationError(
                _("Password must contain at least one capital letter (A-Z)."),
                code='password_no_upper',
            )
        if not any(char.isdigit() for char in password):
            raise ValidationError(
                _("Password must contain at least one number (0-9)."),
                code='password_no_digit',
            )
        if not any(char in '!@#' for char in password):
            raise ValidationError(
                _("Password must contain at least one special character from the set: !@#"),
                code='password_no_special',
            )

    def get_help_text(self):
        return _(
            "Your password must be at least 8 characters long, contain at least one capital letter, "
            "at least one number, and at least one special character from !@#."
        )
