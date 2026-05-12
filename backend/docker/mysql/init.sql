-- docker/mysql/init.sql
-- Script de inicialización para MySQL

-- Crear base de datos si no existe (aunque ya la crea docker-compose)
CREATE DATABASE IF NOT EXISTS mi_estudio_dev;

-- Configurar charset
ALTER DATABASE mi_estudio_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario si no existe (docker-compose ya lo hace)
-- GRANT ALL PRIVILEGES ON mi_estudio_prod.* TO 'mi_estudio_user'@'%';

FLUSH PRIVILEGES;
