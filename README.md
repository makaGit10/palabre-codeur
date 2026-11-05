# Palabre

**L'arbre à palabres des développeurs africains.**
Pour les devs, par les devs.

Palabre est une plateforme d'échange entre développeurs africains : on y pose ses questions, on partage du code pour les API de chez nous (Wave, Orange Money, MTN MoMo, PayTech…) et celui qui aide est récompensé, en réputation et, si l'auteur le souhaite, par une prime en mobile money.

Projet présenté au **Systalink Challenge (concours CADEV 2026)** par l'équipe **ByteByByte**, sur le thème *« Construire la plateforme d'échange africaine, pour les devs, par les devs »*.

---

## Pour le jury

| | |
|---|---|
| **Démo en ligne** | _adresse communiquée après le déploiement sur Datacloud_ |
| **Vidéo de présentation** | deux boutons sur la page d'accueil : « L'essentiel » (2 min) et « La visite complète » (2 min 50) |
| **Code source** | https://github.com/makaGit10/palabre-codeur |
| **Comptes de test** | proposés sur la page de connexion : un clic suffit, le mot de passe y est affiché |

| Compte de démonstration | E-mail | Mot de passe | Ce qu'il permet de voir |
|---|---|---|---|
| Mareme MAKALOU (Sénégal) | `marememakalou10@gmail.com` | `12345678` | Question Wave avec prime en attente, portefeuille garni avec historique, badges, messages et notifications |
| mlle_tech (Sénégal) | `mlletech11@gmail.com` | `12345678` | Second compte pour tester à deux : répondre, voter, valider une réponse, messages privés, salons et groupes |

Parcours conseillé, en cinq minutes : lire une question sans compte, se connecter avec un compte de démonstration, poser une question avec une prime (les questions proches apparaissent dès le titre), répondre et voter, puis ouvrir le portefeuille, le classement et la recherche globale (Ctrl K).

## Pourquoi Palabre

Les plateformes de questions-réponses existantes sont pensées ailleurs. Un développeur à Dakar, Abidjan ou Douala y trouve rarement de l'aide sur ce qui fait son quotidien : intégrer un paiement Wave, calculer l'IPRES dans une paie, rendre une application utilisable en 3G, retirer de l'argent sans carte bancaire.

Palabre part de ces besoins :

| Problème | Ce que fait Palabre |
|---|---|
| Les questions locales restent sans réponse | Questions-réponses en français, centrées sur les API et contraintes africaines |
| On cherche des heures le bon bout de code | Bibliothèque de **snippets** pour les API africaines, confirmés « testé » par la communauté |
| Aider prend du temps et ne rapporte rien | **Primes** en mobile money, versées automatiquement quand la réponse est validée |
| Chaque pays a sa monnaie et ses moyens de paiement | **Portefeuille** multi-pays : montants affichés dans la monnaie locale, retrait avec les moyens du pays |
| Les mêmes questions reviennent sans cesse | **Détection de doublons** pendant la saisie du titre et première piste proposée automatiquement |
| La motivation s'essouffle | Réputation, badges et **Coupe des pays** (classement entre pays) |

## Fonctionnalités

- **Questions et réponses** en Markdown avec code coloré, étiquettes, votes (un vote par personne, annulable), validation de la meilleure réponse.
- **Détection de doublons** : pendant la frappe du titre, PostgreSQL (trigrammes `pg_trgm`) propose les questions déjà posées.
- **Suggestion automatique** : à la publication, si une question proche est déjà résolue, sa réponse validée est proposée comme première piste, signalée « à vérifier par la communauté ». Chacun peut la noter utile ou la signaler.
- **Primes** de 500, 1 000 ou 2 000 FCFA : bloquées à la publication, versées au portefeuille de l'auteur de la réponse validée, remboursées après 7 jours sans validation.
- **Portefeuille** : solde en crédits (1 crédit = 1 FCFA), historique, retrait vers Wave, Orange Money, Free Money, MTN MoMo, Moov Money, carte ou virement selon le pays. Les numéros sont masqués dans l'historique.
- **Multi-pays** : les 26 pays d'Afrique francophone (UEMOA, CEMAC, Guinée, Mauritanie, RD Congo, Maghreb, océan Indien et Afrique de l'Est), chacun avec sa monnaie, son indicatif et ses moyens de retrait (Wave, Orange Money, MTN MoMo, Moov Money, Airtel Money, M-Pesa, Flooz, T-Money, MVola, carte, virement). Montants convertis dans la monnaie locale (ex. 2 000 FCFA ≈ 33 MAD au Maroc).
- **Snippets** : langage et API libres (on peut ajouter ceux qui manquent), aperçu coloré, bouton « Je l'ai testé ».
- **Recherche globale** (Ctrl K) et suggestions pendant la frappe sous les barres de recherche : questions, extraits de code, salons et groupes, membres et messages, résultats groupés par section, dernières recherches mémorisées.
- **Interface en français et en anglais** (bouton globe), messages de l'API dans la langue choisie.
- **Classement** : Coupe des pays et meilleurs développeurs. **Profils** avec badges et activité.
- **Salons « Sous l'arbre »** : discussions publiques par sujet (#wave, #laravel…) et par pays, un salon pour chacun des 26 pays couverts (#sénégal, #maroc, #rd-congo…), avec un filtre pour trouver un salon ou un pays. Tout le monde lit, les membres écrivent.
- **Groupes privés** : créés par un membre, avec un nom, des invités et un administrateur ; lecture et écriture réservées aux membres, non-lus par groupe.
- **Messages vivants** : mentions `@` avec autocomplétion (la personne est notifiée), emojis et réactions, modification pendant 1 heure (mention « modifié »), suppression pour tout le monde pendant 24 heures (« Message supprimé »). Chaque règle est vérifiée côté serveur.
- **Messages privés** entre développeurs : recherche d'un développeur par son nom pour lui écrire, « développeurs d'ici » (les plus actifs de son pays) et ses groupes en tête de liste, compteur de non-lus.
- **Partage** : un bouton « Partager » sur chaque question et chaque extrait envoie une carte cliquable dans une conversation ou un salon, avec un mot d'accompagnement. Les messages acceptent le Markdown : code coloré entre trois accents graves, liens cliquables.
- **Temps réel** : quand quelqu'un publie, répond, vote, valide ou modère, les autres personnes connectées voient le changement s'afficher en une à deux secondes, sans recharger la page (WebSocket Laravel Reverb, MIT). Le serveur n'envoie jamais de données, seulement le nom des rubriques touchées ; chaque écran recharge alors en silence par l'API, avec ses contrôles d'accès. Un seul point d'envoi (middleware), déclenché uniquement par une écriture réussie en base ; les écritures techniques (sessions, cache, journaux) ne comptent pas ; les signaux rapprochés sont regroupés ; un onglet caché attend d'être visible ; un formulaire en cours de saisie n'est jamais touché ; l'auteur de la modification n'est pas rechargé ; si le serveur temps réel tombe, rien ne casse.
- **Notifications** : réponse reçue, réponse validée, prime versée, message privé. La messagerie et les notifications gardent leur propre rafraîchissement.
- **Lecture libre, participation réservée aux membres** : tout le monde peut lire, il faut un compte pour poser, répondre, voter ou payer.
- Interface **responsive** (barre latérale repliable sur ordinateur, barre d'onglets sur téléphone) et **mode sombre**.

> Les paiements fonctionnent en **mode test** pendant le concours : aucun argent réel ne circule. La **recharge du portefeuille passe par PayTech** (paytech.sn, environnement de test) : page de paiement PayTech, retour sur Palabre, notification IPN authentifiée par l'empreinte SHA-256 des clés, crédit unique par référence. PayTech exige une adresse en HTTPS : ce parcours est actif sur la démo en ligne ; en local, la recharge est simulée. Les retraits (Wave, Orange Money, MTN MoMo…) sont simulés, car les API de versement demandent un compte marchand validé. Tout passe par l'interface `PaymentGateway`, prête pour la production.

## Architecture

```
┌────────────────────────┐   /api (cookie de session + CSRF)   ┌────────────────────────┐
│  Front-end React 19     │ ──────────────────────────────────▶ │  API Laravel 13         │
│  Vite · TypeScript      │                                     │  Sanctum (SPA)          │
│  Tailwind · React Query │ ◀────────────────────────────────── │  Services métier        │
└────────────────────────┘                JSON                  └───────────┬────────────┘
                                                                            │
                                               ┌────────────────────────────┼──────────────────────┐
                                               ▼                            ▼                      ▼
                                      PostgreSQL 17               Valkey 8 (cache,         PaymentGateway
                                      (données, pg_trgm)          sessions, files)         (mode test)

                       navigateurs ◀── « rubrique X a changé » ── Reverb (WebSocket) ◀── API, après chaque écriture réussie
```

**Choix techniques**

- **Logique métier dans des services** (`QuestionService`, `VoteService`, `WalletService`) : les contrôleurs restent simples et testables.
- **Argent et réputation en transactions** avec verrous de ligne (`lockForUpdate`) : une prime ne peut pas être versée deux fois, un solde ne peut pas être retiré deux fois, même en cas de double clic.
- **Montants en entiers** (FCFA) : pas d'erreurs d'arrondi.
- **Sécurité** : session par cookie `HttpOnly` avec protection CSRF, mots de passe hachés (bcrypt), limitation des requêtes (5 tentatives de connexion par minute, 30 écritures par minute), validation de toutes les entrées côté serveur, Markdown affiché sans HTML brut (pas d'injection de script), profils publics sans e-mail ni solde, champs sensibles (réputation, solde) jamais modifiables par une requête.
- **Prévention des requêtes N+1** activée en développement.
- **Valkey plutôt que Redis**, **PostgreSQL plutôt que MySQL** : licences permissives (voir plus bas).

## Structure du dépôt

```
palabre/
├── docker-compose.yml        PostgreSQL, Valkey et l'API
├── backend/                  API Laravel
│   ├── app/Services/         Règles métier (questions, votes, portefeuille)
│   ├── app/Payments/         Interface de paiement et version de test
│   ├── app/Http/             Contrôleurs, validation, ressources JSON
│   ├── config/palabre.php    Pays, moyens de paiement, montants, réputation
│   ├── database/             Migrations et données de démonstration
│   └── tests/Feature/Api/    Tests automatiques
└── frontend/                 Application React
    └── src/
        ├── pages/            Écrans
        ├── components/       Éléments réutilisables (arbre à code, cartes…)
        ├── services/         Appels à l'API
        └── lib/              Format, monnaies, client HTTP
```

## Installation en local

**Prérequis** : Docker Desktop et Node.js 20 ou plus récent.

```bash
git clone https://github.com/makaGit10/palabre-codeur.git
cd palabre-codeur

# 1. Back-end : base de données, cache et API (http://localhost:8000)
cp backend/.env.example backend/.env      # puis renseigner DB_PASSWORD, DEMO_PASSWORD et DEMO_ACCOUNTS_PUBLIC=true
docker compose build
docker compose run --rm --no-deps api composer install   # dépendances dans un volume Docker (rapide sous Windows)
docker compose up -d
docker compose exec api php artisan key:generate
docker compose exec api php artisan migrate --seed

# 2. Front-end (http://localhost:5180)
cd frontend
cp .env.example .env   # facultatif : VITE_DEMO_VIDEO_URL, lien YouTube de la vidéo de démo
npm install
npm run dev
```

Comptes de démonstration : ceux de l'équipe (`marememakalou10@gmail.com`, `mlletech11@gmail.com`) et `moussa@palabre.test`, `fatou@palabre.test`, `yasmine@palabre.test`…, tous avec le mot de passe `DEMO_PASSWORD`. Avec `DEMO_ACCOUNTS_PUBLIC=true`, la page de connexion propose les deux comptes de l'équipe en un clic et affiche ce mot de passe : réglage prévu pour la démo du concours, à laisser sur `false` pour une vraie mise en service.

## Tests et qualité

```bash
docker compose exec api php artisan test     # 91 tests sur une base PostgreSQL dédiée
docker compose exec api ./vendor/bin/pint    # style du code PHP (Laravel Pint)
cd frontend && npx tsc -b && npx oxlint src  # types TypeScript et analyse du code
```


Les tests couvrent notamment : la prime bloquée puis versée une seule fois, le refus de valider la question d'un autre, un seul vote par personne, le refus de voter pour soi, les retraits limités au solde et aux moyens du pays, le masquage des numéros, la confidentialité des profils, la détection de doublons, l'inscription, la connexion, la limitation des tentatives, les messages en français et le temps réel (signal après une écriture réussie seulement, jamais après une lecture ni une écriture technique, et jamais fatal si le serveur WebSocket est injoignable).

Le temps réel a aussi son test de bout en bout, avec deux navigateurs ouverts en même temps (`demo/check-live.mjs`, Playwright) : B voit la modification de A sans recharger et en un seul rechargement ; l'écran de A ne se recharge pas lui-même ; aucun rechargement pendant 12 secondes sans modification ; une fenêtre ouverte chez B reste ouverte et se met à jour ; un onglet caché se met à jour quand il redevient visible ; un tour de tous les écrans pendant une modification ne produit aucune erreur JavaScript.

## Droits sur Palabre

Palabre est une œuvre protégée : **tous droits réservés** à ses auteurs (Mareme MAKALOU, mlle_tech et Astou Sow, équipe ByteByByte). Aucune réutilisation du code n'est permise sans autorisation écrite ; seule la licence limitée d'évaluation prévue par le règlement du concours est accordée à l'organisateur (voir le fichier `LICENSE`).

## Licences des composants

Le règlement n'autorise que des composants sous licence permissive. Toutes les dépendances ont été vérifiées.

| Partie | Composants principaux | Licence |
|---|---|---|
| Back-end | Laravel 13, Sanctum, Reverb, Predis, Carbon, Symfony | MIT |
| Back-end | Bibliothèques Symfony et PHP diverses | MIT, BSD-3-Clause, Apache-2.0 |
| Back-end | `nette/schema`, `nette/utils` (dépendances indirectes de Laravel) | Triple licence BSD-3-Clause / GPL-2.0 / GPL-3.0 : **utilisés sous BSD-3-Clause** |
| Front-end | React, React Router, TanStack Query, Axios, Vite, Tailwind CSS | MIT |
| Front-end | react-markdown, remark-gfm, rehype-highlight, laravel-echo, pusher-js | MIT |
| Front-end | highlight.js (coloration du code) | BSD-3-Clause |
| Base de données | PostgreSQL 17 | PostgreSQL License (permissive) |
| Cache | Valkey 8 | BSD-3-Clause |
| Polices | Bricolage Grotesque, DM Sans, JetBrains Mono (Google Fonts) | SIL Open Font License 1.1 |

Bilan (5 novembre 2026) : front-end livré au navigateur, 148 paquets dont 145 MIT, 1 ISC, 1 BSD-3-Clause et 1 Unlicense ; back-end (production), 92 paquets dont 84 MIT, 7 BSD-3-Clause et 1 Apache-2.0. **Aucun composant sous licence GPL, AGPL ou LGPL n'est utilisé.** Redis (passé sous licence AGPL) a été écarté au profit de Valkey, et MySQL (GPL) au profit de PostgreSQL.

## Équipe ByteByByte

*« Octet-toi de là, on arrive ! »*

- **Mareme MAKALOU** : conception du produit, design de l'interface, développement front-end et back-end
- **mlle_tech** : tests et qualité (scénarios de test, tests automatisés de l'API, test de bout en bout), vérification des règles métier, déploiement de la démo
- **Astou Sow** : tests utilisateurs et retours d'usage, contenus et données de démonstration, communication (vidéo de présentation, campagne du vote)

Dakar, Sénégal · 2026
