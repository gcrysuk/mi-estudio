import requests
from django.conf import settings

MP_API_BASE = 'https://api.mercadopago.com'


def _headers():
    return {
        'Authorization': f'Bearer {settings.MP_ACCESS_TOKEN}',
        'Content-Type': 'application/json',
    }


def crear_suscripcion(usuario_email, external_reference, start_date, monto, back_url):
    """
    Crea un preapproval en MP y devuelve (preapproval_id, init_point).
    start_date: datetime con la fecha de inicio del primer cobro (al terminar el trial).
    """
    payload = {
        'reason': 'Mi Estudio - Plan Mensual',
        'external_reference': str(external_reference),
        'payer_email': usuario_email,
        'auto_recurring': {
            'frequency': 1,
            'frequency_type': 'months',
            'start_date': start_date.isoformat(),
            'transaction_amount': float(monto),
            'currency_id': 'ARS',
        },
        'back_url': back_url,
        'status': 'pending',
    }
    resp = requests.post(
        f'{MP_API_BASE}/preapproval',
        json=payload,
        headers=_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    return data['id'], data['init_point']


def cancelar_suscripcion(preapproval_id):
    """Cancela una suscripción activa en MP."""
    resp = requests.put(
        f'{MP_API_BASE}/preapproval/{preapproval_id}',
        json={'status': 'cancelled'},
        headers=_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def obtener_suscripcion(preapproval_id):
    """Obtiene el estado actual de una suscripción en MP."""
    resp = requests.get(
        f'{MP_API_BASE}/preapproval/{preapproval_id}',
        headers=_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def obtener_pago(payment_id):
    """Obtiene el detalle de un pago en MP (usado al procesar webhooks de tipo 'payment')."""
    resp = requests.get(
        f'{MP_API_BASE}/v1/payments/{payment_id}',
        headers=_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()
