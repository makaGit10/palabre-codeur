# Image PHP de développement pour l'API Palabre
FROM php:8.4-cli

# Extensions : PostgreSQL, zip (Composer), bcmath (calculs monétaires exacts), opcache (performances)
RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libpq-dev libzip-dev \
    && docker-php-ext-install pdo_pgsql zip bcmath opcache pcntl \
    && rm -rf /var/lib/apt/lists/*

# OPcache : le code PHP compilé reste en mémoire (gros gain sous Docker Desktop pour Windows).
# Les fichiers modifiés sont relus au plus toutes les 2 secondes, ce qui convient au développement.
RUN { \
      echo 'opcache.enable=1'; \
      echo 'opcache.enable_cli=1'; \
      echo 'opcache.memory_consumption=192'; \
      echo 'opcache.max_accelerated_files=20000'; \
      echo 'opcache.validate_timestamps=1'; \
      echo 'opcache.revalidate_freq=2'; \
    } > /usr/local/etc/php/conf.d/opcache-palabre.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
