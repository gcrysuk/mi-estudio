# config/settings/local.py
from .base import *

DEBUG = True

# Email a consola para desarrollo
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Logging más detallado
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
