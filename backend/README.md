# Palabre — API

Back-end de Palabre : API REST Laravel, base PostgreSQL, cache et sessions Valkey.

- `app/Services/` : règles métier (questions et primes, votes, portefeuille, messagerie)
- `app/Payments/` : interface de paiement et version de test
- `app/Http/` : contrôleurs, validation, ressources JSON
- `config/palabre.php` : pays, moyens de paiement, montants, réputation, messagerie
- `database/` : migrations et données de démonstration
- `tests/Feature/Api/` : tests automatiques

Installation, lancement et tests : voir le `README.md` à la racine du dépôt.
