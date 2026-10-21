# syntax=docker/dockerfile:1
# Image de production de Palabre : le front-end React construit et l'API Laravel servie par FrankenPHP
# (serveur Caddy + PHP dans un seul processus : HTTPS automatique, HTTP/3, compression).
# À construire depuis la racine du dépôt : voir deploy/docker-compose.yml

# ── 1. Front-end : fichiers statiques optimisés ───────────────────────────────
FROM node:22-alpine AS frontend
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend ./
RUN npm run build

# ── 2. Dépendances PHP, sans les outils de développement ──────────────────────
FROM composer:2 AS vendor
WORKDIR /src
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY backend ./
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev

# ── 3. Serveur ────────────────────────────────────────────────────────────────
FROM dunglas/frankenphp:1-php8.4
RUN install-php-extensions pdo_pgsql bcmath opcache zip pcntl \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY deploy/php.ini /usr/local/etc/php/conf.d/zz-palabre.ini
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY deploy/entrypoint.sh /usr/local/bin/palabre
COPY --from=vendor /src /app
COPY --from=frontend /src/dist /app/frontend
RUN chmod +x /usr/local/bin/palabre
WORKDIR /app
ENTRYPOINT ["palabre"]
