FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Instalar dependencias del sistema necesarias para mysqlclient y otras librerías
RUN apt-get update && apt-get install -y \
    gcc \
    pkg-config \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias de Python (incluyendo setuptools explícitamente)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Verificar que todo está instalado correctamente
RUN python -c "import pkg_resources; print('pkg_resources OK')" || echo "ERROR: pkg_resources not found"
RUN python -c "import rest_framework_simplejwt; print('simplejwt OK')" || echo "ERROR: simplejwt not found"

COPY . .
