#!/bin/bash

echo "🚀 Instalando MI ESTUDIO en local..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    exit 1
fi

# Crear directorios si no existen
mkdir -p media static logs

# Dar permisos
chmod -R 755 media static

# Detener contenedores existentes
docker-compose -f docker-compose.local.yml down

# Construir imágenes
docker-compose -f docker-compose.local.yml build

# Levantar servicios
docker-compose -f docker-compose.local.yml up -d

# Esperar a que MySQL esté listo
echo "⏳ Esperando a que MySQL esté listo..."
sleep 20

# Crear migraciones y superusuario
docker-compose -f docker-compose.local.yml exec web python manage.py makemigrations
docker-compose -f docker-compose.local.yml exec web python manage.py migrate

echo "¿Crear superusuario? (s/n)"
read -r crear
if [ "$crear" = "s" ]; then
    docker-compose -f docker-compose.local.yml exec web python manage.py createsuperuser
fi

# Colectar archivos estáticos
docker-compose -f docker-compose.local.yml exec web python manage.py collectstatic --noinput

echo "✅ Instalación completa!"
echo "📱 Accesos:"
echo "   - Django: http://localhost:8000"
echo "   - Admin: http://localhost:8000/admin"
echo "   - Nginx: http://localhost"
echo "   - API: http://localhost:8000/api/v1/"
