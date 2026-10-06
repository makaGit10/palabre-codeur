#!/bin/sh
# Démarrage du conteneur de production : migrations, caches, puis le serveur.
# Avec des arguments (ex. php artisan db:seed), exécute simplement la commande demandée.
set -e
cd /app

if [ "$#" -gt 0 ]; then
    exec "$@"
fi

php artisan migrate --force --no-interaction
php artisan optimize --no-interaction

exec frankenphp run --config /etc/caddy/Caddyfile
