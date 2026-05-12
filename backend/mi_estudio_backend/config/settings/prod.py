
"""
Configuración de producción para MI ESTUDIO
"""
from .base import *

# Debug
DEBUG = False

# Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# SSL Settings (descomenta cuando tengas HTTPS)
# SECURE_SSL_REDIRECT = True
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True

# CORS más restrictivo para producción
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    f"https://{config('DOMAIN', default='localhost')}",
    f"http://{config('DOMAIN', default='localhost')}",
]

# Logging para producción
LOGGING['handlers']['file']['filename'] = '/app/logs/django.log'
LOGGING['handlers']['console']['level'] = 'WARNING'
LOGGING['root']['level'] = 'INFO'

# Cache (usando Redis)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://redis:6379/1'),
    }
}

# Session usando cache
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Configuración de archivos estáticos para producción
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Configuración de email para producción
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
