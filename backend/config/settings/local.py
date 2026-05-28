# config/settings/local.py
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']  # <--- ESTA LÍNEA ES LA QUE FALTA

# Email: base.py elige automáticamente SMTP o consola según EMAIL_HOST_USER

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
