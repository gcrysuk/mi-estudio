# config/celery_app.py
import os
from celery import Celery

# Establecer la configuración por defecto de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

app = Celery('mi_estudio')

# Usar string de configuración para que el worker no tenga que serializar
app.config_from_object('django.conf:settings', namespace='CELERY')

# Cargar tareas de todos los apps registrados
app.autodiscover_tasks()

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
