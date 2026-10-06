# Déployer Palabre sur un serveur

Un seul serveur Ubuntu (2 Go de RAM suffisent) avec Docker. Tout tourne dans trois conteneurs : l'application (front-end + API, servie par FrankenPHP avec HTTPS automatique), PostgreSQL et Valkey. La base de données et Valkey ne sont jamais joignables depuis l'extérieur.

## 1. Préparer le serveur

```bash
ssh root@ADRESSE_IP
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
# Pare-feu : seuls SSH et le web restent ouverts
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw allow 443/udp && ufw --force enable
```

Si vous avez un nom de domaine, faites pointer son enregistrement `A` vers l'adresse IP du serveur avant de continuer : le certificat HTTPS sera obtenu automatiquement.

## 2. Récupérer le projet et le configurer

```bash
git clone https://github.com/makaGit10/palabre-codeur.git /opt/palabre
cd /opt/palabre/deploy
cp .env.example .env
nano .env        # SERVER_NAME, APP_URL, DB_PASSWORD, mots de passe de démonstration…
docker compose run --rm --no-deps app php artisan key:generate --show   # à coller dans APP_KEY
```

## 3. Lancer

```bash
docker compose up -d --build          # la première construction prend quelques minutes
docker compose exec app php artisan db:seed --force   # une seule fois : comptes et contenus de démonstration
docker compose ps                     # « healthy » quand tout est prêt
```

L'application répond sur `https://votre-domaine`. Les migrations de base de données s'exécutent automatiquement à chaque démarrage.

## 4. Mettre à jour

```bash
cd /opt/palabre && git pull && cd deploy && docker compose up -d --build
```

## 5. Au quotidien

```bash
docker compose logs -f app                                                        # journaux
docker compose exec db pg_dump -U palabre palabre | gzip > palabre-$(date +%F).sql.gz   # sauvegarde
gunzip -c palabre-2026-10-20.sql.gz | docker compose exec -T db psql -U palabre palabre  # restauration
```

## Sans nom de domaine

Let's Encrypt exige un nom de domaine : avec une adresse IP seule, l'application fonctionne en HTTP. Dans `.env` : `SERVER_NAME=:80`, `APP_URL=http://ADRESSE_IP`, `SANCTUM_STATEFUL_DOMAINS=ADRESSE_IP`, `SESSION_SECURE_COOKIE=false`. Un domaine coûte environ 10 000 FCFA par an et rend le HTTPS automatique.

## Ce que cette configuration garantit

- HTTPS avec renouvellement automatique, HSTS, compression, HTTP/3.
- En-têtes de sécurité sur chaque réponse, politique de contenu (CSP) stricte pour le front-end.
- Cookies de session `Secure`, `HttpOnly`, `SameSite=Lax` ; protection CSRF ; limites de requêtes par personne et par adresse IP.
- `APP_DEBUG=false`, version de PHP masquée, téléversement de fichiers désactivé.
- Le seeder refuse les mots de passe de démonstration faibles en production.
