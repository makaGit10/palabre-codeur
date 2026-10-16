<?php

namespace Database\Seeders;

use App\Models\Answer;
use App\Models\Badge;
use App\Models\Conversation;
use App\Models\Question;
use App\Models\Room;
use App\Models\Snippet;
use App\Models\Tag;
use App\Models\User;
use App\Notifications\NewAnswer;
use App\Notifications\NewDirectMessage;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

// Données de démonstration (identiques à celles du prototype).
// Le mot de passe des comptes vient de .env (DEMO_PASSWORD) : jamais écrit dans le code publié.
// Les heredocs PHP retirent automatiquement l'indentation de leur balise de fin.
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /** @var array<string, User> */
    private array $users = [];

    private Question $q1;

    private Answer $moussaAnswer;

    public function run(): void
    {
        $this->seedUsers();
        $this->seedBadges();
        $this->seedQuestions();
        $this->seedMoreQuestions();
        $this->seedSnippets();
        $this->seedMoreSnippets();
        $this->seedWallet();
        $this->seedMessaging();
        $this->seedMoreConversations();
    }

    private function seedUsers(): void
    {
        // En ligne, interdit de créer des comptes avec un mot de passe vide ou « password »
        if (app()->isProduction() && in_array(config('palabre.demo.password'), [null, '', 'password'], true)) {
            throw new \RuntimeException('Définissez DEMO_PASSWORD dans .env avant de lancer le seeder.');
        }

        $people = [
            'mareme' => ['Mareme MAKALOU', 'SN', 'Dakar', 1240, 2500],
            'mlletech' => ['mlle_tech', 'SN', 'Dakar', 860, 0],
            'moussa' => ['Moussa Diop', 'SN', 'Dakar', 3870, 6500],
            'fatou' => ['Fatou Ndiaye', 'SN', 'Thiès', 2950, 3000],
            'rodrigue' => ['Rodrigue Ntsama', 'CM', 'Douala', 2410, 1500],
            'yasmine' => ['Yasmine Benali', 'MA', 'Casablanca', 2105, 2000],
            'mariam' => ['Mariam Ouédraogo', 'BF', 'Ouagadougou', 1880, 500],
            'aminata' => ['Aminata Keïta', 'ML', 'Bamako', 990, 0],
            'awa' => ['Awa Koné', 'CI', 'Abidjan', 1610, 1000],
        ];

        foreach ($people as $key => [$name, $country, $city, $reputation, $earnings]) {
            $user = User::create([
                'name' => $name,
                'email' => match ($key) {
                    'mareme' => config('palabre.demo.owner_email'),
                    'mlletech' => config('palabre.demo.teammate_email'),
                    default => "{$key}@palabre.test",
                },
                'password' => config('palabre.demo.password'),
                'country' => $country,
                'city' => $city,
            ]);
            // Colonnes protégées : modifiées directement, jamais via une requête
            // Colonnes protégées : modifiées directement, jamais via une requête ; comptes de démo déjà vérifiés
            $user->forceFill(['reputation' => $reputation, 'bounty_earnings' => $earnings, 'email_verified_at' => now()])->save();
            $this->users[$key] = $user;
        }
        // La propriétaire du projet modère : rôle donné ici, jamais par une requête
        $this->users['mareme']->forceFill(['is_admin' => true])->save();
    }

    private function seedBadges(): void
    {
        $badges = [
            'first-question' => ['🌱', 'Première question', ['mareme', 'aminata']],
            'streak-7' => ['🔥', "7 jours d'affilée", ['mareme']],
            'bounty-hunter' => ['💰', 'Chasseur de primes', ['moussa']],
            'fast-answer' => ['⚡', 'Réponse en moins de 10 min', ['moussa']],
            'wave-expert' => ['🧩', 'Expert Wave', ['moussa']],
            'teacher' => ['📚', 'Pédagogue', ['fatou']],
            'payroll-expert' => ['🧾', 'Experte paie', ['fatou']],
            'security-guard' => ['🛡️', 'Gardien de la sécurité', ['rodrigue']],
            'first-to-answer' => ['🌍', 'Premier à répondre', ['yasmine']],
            'api-integrator' => ['🔌', 'Intégratrice API', ['mariam']],
            'mobile-expert' => ['📱', 'Experte mobile', ['awa']],
        ];

        foreach ($badges as $slug => [$icon, $label, $owners]) {
            $badge = Badge::create(compact('slug', 'icon', 'label'));
            foreach ($owners as $owner) {
                $badge->users()->attach($this->users[$owner]->id, ['awarded_at' => now()]);
            }
        }
    }

    private function seedQuestions(): void
    {
        $u = $this->users;

        $q1 = $this->q1 = $this->question($u['mareme'], 12, 'Webhook Wave : aucune notification reçue en production', ['wave', 'laravel', 'webhook'], 14, 212, <<<'MD'
            Mon intégration **Wave Checkout** marche très bien en local avec ngrok : le webhook est appelé et la commande passe en « payée ».

            En production, le client paie bien, mais mon endpoint ne reçoit **jamais** la notification.

            ```php
            // routes/web.php
            Route::post('/webhooks/wave', [WaveController::class, 'handle']);
            ```

            Les logs Laravel sont vides. Quelqu'un a déjà eu le problème ?
            MD,
            "Quand un webhook fonctionne en local mais pas en production, la cause la plus fréquente avec Laravel est la protection CSRF : une route déclarée dans web.php rejette les appels externes avec une erreur 419. Vérifiez aussi que l'URL est en HTTPS avec un certificat valide, et regardez les logs NGINX pour savoir si la requête arrive jusqu'au serveur.");
        $this->bounty($q1, 1000, 'wave');
        $this->moussaAnswer = $this->answer($q1, $u['moussa'], 4, 9, <<<'MD'
            J'ai eu exactement ce cas sur une boutique à Dakar. Ta route est dans `web.php`, donc protégée par le CSRF : Wave reçoit une **419** et abandonne.

            Déplace-la dans `api.php` et vérifie la signature :

            ```php
            // routes/api.php
            Route::post('/webhooks/wave', [WaveController::class, 'handle']);

            // WaveController.php
            $signature = $request->header('Wave-Signature');
            if (! WaveSignature::isValid($signature, $request->getContent())) {
                abort(401);
            }
            ```

            Dans le tableau de bord Wave, mets bien l'URL complète : `https://ton-domaine.com/api/webhooks/wave`.
            MD);
        $this->answer($q1, $u['rodrigue'], 2, 3, "En plus de ce que dit Moussa : Wave refuse les URLs en HTTP. Vérifie que ton certificat SSL est valide (pas auto-signé), sinon l'appel échoue avant même d'atteindre Laravel.");

        $q2 = $this->question($u['rodrigue'], 40, "MTN MoMo sandbox : le callback n'est jamais appelé", ['mtn-momo', 'python', 'sandbox'], 8, 96, <<<'MD'
            Je teste **requesttopay** sur la sandbox MTN MoMo. Le statut passe bien à `SUCCESSFUL` quand je le consulte, mais l'URL de callback n'est jamais appelée.

            ```python
            headers = {
                "X-Callback-Url": "https://api.monapp.cm/momo/callback",
                "X-Target-Environment": "sandbox",
            }
            ```
            MD,
            "Dans la sandbox MTN MoMo, le callback n'est pas toujours déclenché. Vérifiez que le domaine du callback correspond à celui déclaré pour votre API user, et prévoyez une vérification périodique du statut en secours.");
        $this->bounty($q2, 2000, 'orange_money');

        $q3 = $this->question($u['aminata'], 120, "Comment calculer l'IPRES et la CSS dans un logiciel de paie sénégalais ?", ['paie', 'senegal', 'sql'], 21, 540,
            "Je développe un module de paie pour un client à Dakar. Quels taux et plafonds appliquer pour l'IPRES (régime général et cadres) et la CSS ? Et où les stocker pour qu'ils restent modifiables ?",
            "Stockez les taux et plafonds dans une table de paramètres datée (date d'effet), jamais en dur dans le code : ils changent régulièrement. Faites valider les valeurs par un expert-comptable avant la mise en production.");
        $accepted = $this->answer($q3, $u['fatou'], 60, 17, <<<'MD'
            Ne mets jamais les taux en dur. Crée une table de paramètres avec une date d'effet, et calcule chaque cotisation à partir du salaire plafonné :

            ```sql
            SELECT code, taux_salarial, taux_patronal, plafond
            FROM parametres_paie
            WHERE date_effet <= :date_paie
            ORDER BY date_effet DESC;
            ```

            Comme ça, quand la loi change, tu ajoutes une ligne et l'historique des anciennes paies reste juste.
            MD);
        $q3->forceFill(['accepted_answer_id' => $accepted->id])->save();

        $q4 = $this->question($u['mariam'], 180, 'Orange Money API : erreur 401 lors de la génération du token', ['orange-money', 'nodejs'], 6, 150,
            "J'obtiens une erreur **401** sur l'endpoint OAuth d'Orange alors que mes identifiants sont corrects.",
            "Une erreur 401 sur le token Orange vient souvent de l'en-tête Authorization : il doit contenir « Basic » suivi de client_id:client_secret encodé en base64, sans espace en trop.");
        $this->bounty($q4, 500, 'orange_money');
        $this->answer($q4, $u['yasmine'], 150, 4, "Vérifie l'encodage : c'est `Basic base64(client_id:client_secret)`, et le corps doit être en `x-www-form-urlencoded`, pas en JSON.");

        $this->question($u['yasmine'], 1500, "Flutter : mon application rame sur les téléphones d'entrée de gamme", ['flutter', 'performance'], 11, 310,
            'Sur un téléphone à 2 Go de RAM, mes listes saccadent. Quelles optimisations prioriser ?',
            'Commencez par ListView.builder pour les longues listes, des images redimensionnées côté serveur, et un profilage en mode profile plutôt qu’en debug.');

        $q6 = $this->question($u['moussa'], 1600, "Héberger une app Laravel avec un petit budget en Afrique de l'Ouest", ['laravel', 'hebergement', 'devops'], 17, 620,
            "Pour un client avec un budget serré, quelle configuration conseillez-vous : VPS, mutualisé, autre ? La latence vers l'Europe compte aussi.",
            "Un petit VPS avec NGINX, PHP-FPM et une file d'attente suffit pour démarrer. Mettez un CDN devant les fichiers statiques pour réduire la latence.");
        $this->answer($q6, $u['rodrigue'], 1500, 7, 'Un VPS 2 vCPU / 4 Go suffit largement au début. NGINX + PHP-FPM + Valkey, et des sauvegardes automatiques quotidiennes. Évite le mutualisé si tu as des files d’attente.');
        $this->answer($q6, $u['fatou'], 1400, 3, "Pense aussi à compresser les réponses (gzip) et à servir des images en WebP : beaucoup d'utilisateurs sont en 3G.");

        $q7 = $this->question($u['awa'], 3000, 'React : gérer le mode hors ligne quand la connexion 3G est instable', ['react', 'pwa', 'offline'], 13, 280,
            "Mes utilisateurs perdent souvent la connexion. Comment garder l'app utilisable et synchroniser plus tard ?",
            'Utilisez un service worker pour le cache, IndexedDB pour stocker les actions en attente, et une synchronisation au retour du réseau.');
        $this->answer($q7, $u['moussa'], 2900, 5, "Workbox pour le cache, et une file d'actions dans IndexedDB que tu rejoues à l'événement `online`. Affiche clairement l'état « hors ligne » à l'utilisateur.");
    }

    /** @param list<string> $tags */
    private function question(User $author, int $minutesAgo, string $title, array $tags, int $votes, int $views, string $body, string $ai): Question
    {
        $date = Carbon::now()->subMinutes($minutesAgo);
        $question = new Question(['title' => $title, 'body' => $body]);
        $question->forceFill(['user_id' => $author->id, 'votes' => $votes, 'views' => $views, 'created_at' => $date, 'updated_at' => $date])->save();
        $question->tags()->sync(collect($tags)->map(fn (string $t) => Tag::firstOrCreate(['name' => $t])->id));
        $question->aiSuggestion()->create(['text' => $ai, 'model' => 'démo']);

        return $question;
    }

    private function answer(Question $question, User $author, int $minutesAgo, int $votes, string $body): Answer
    {
        $date = Carbon::now()->subMinutes($minutesAgo);
        $answer = $question->answers()->make(['body' => $body]);
        $answer->forceFill(['user_id' => $author->id, 'votes' => $votes, 'created_at' => $date, 'updated_at' => $date])->save();

        return $answer;
    }

    // Primes de démonstration : ouvertes plus longtemps (DEMO_BOUNTY_DAYS, 30 jours par défaut) pour rester visibles
    // pendant toute l'évaluation ; les vraies primes gardent la règle des 7 jours. Le montant est bloqué chez l'auteur.
    private function bounty(Question $question, int $amount, string $method): void
    {
        $question->bounty()->create(['amount' => $amount, 'payment_method' => $method, 'expires_at' => now()->addDays((int) config('palabre.demo.bounty_days'))]);
        $author = $question->author;
        if ($author->email !== config('palabre.demo.owner_email')) { // le portefeuille de Mareme est fixé dans seedWallet()
            $author->increment('wallet_held', $amount);
            $author->walletTransactions()->create(['type' => 'bounty_held', 'amount' => $amount, 'label' => $question->title, 'payment_method' => $method]);
        }
    }

    private function seedSnippets(): void
    {
        $u = $this->users;
        $snippets = [
            ['mariam', 'Initier un paiement PayTech', 'Un seul appel pour Wave, Orange Money, Free Money et la carte bancaire.', 'JavaScript', 'javascript', ['paytech', 'wave', 'orange-money'], 31, ['moussa', 'fatou', 'awa'], <<<'JS'
                const res = await fetch('https://paytech.sn/api/payment/request-payment', {
                  method: 'POST',
                  headers: { API_KEY, API_SECRET, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    item_name: 'Abonnement Pro',
                    item_price: 5000,
                    currency: 'XOF',
                    ref_command: 'CMD-2026-001',
                    ipn_url: 'https://monapp.sn/ipn',
                  }),
                })
                JS],
            ['rodrigue', 'Demander un paiement MTN MoMo', "Appel requesttopay de l'API Collection, en sandbox.", 'Python', 'python', ['mtn-momo'], 27, ['yasmine', 'awa'], <<<'PY'
                import uuid, requests

                reference = str(uuid.uuid4())
                requests.post(
                    "https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "X-Reference-Id": reference,
                        "X-Target-Environment": "sandbox",
                        "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
                    },
                    json={"amount": "1000", "currency": "EUR", "externalId": "cmd-42",
                          "payer": {"partyIdType": "MSISDN", "partyId": "237670000000"}},
                )
                PY],
            ['yasmine', 'Obtenir un token Orange Money', "Authentification OAuth à faire avant tout appel à l'API Orange.", 'JavaScript · Node.js', 'javascript', ['orange-money'], 40, ['mariam', 'moussa', 'rodrigue', 'fatou'], <<<'JS'
                const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

                const res = await fetch('https://api.orange.com/oauth/v3/token', {
                  method: 'POST',
                  headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: 'grant_type=client_credentials',
                })
                const { access_token } = await res.json()
                JS],
            ['moussa', 'Créer un paiement Wave Checkout', 'Génère un lien de paiement Wave en FCFA et redirige le client.', 'PHP · Laravel', 'php', ['wave'], 58, ['fatou', 'rodrigue', 'yasmine', 'mariam', 'awa'], <<<'PHP'
                $response = Http::withToken(config('services.wave.key'))
                    ->post('https://api.wave.com/v1/checkout/sessions', [
                        'amount'      => '5000',
                        'currency'    => 'XOF',
                        'success_url' => route('paiement.ok'),
                        'error_url'   => route('paiement.erreur'),
                    ]);

                return redirect($response['wave_launch_url']);
                PHP],
        ];

        foreach ($snippets as [$author, $title, $description, $language, $fence, $apis, $votes, $testers, $code]) {
            $snippet = new Snippet(compact('title', 'description', 'language', 'fence', 'apis', 'code'));
            $snippet->forceFill(['user_id' => $u[$author]->id, 'votes' => $votes])->save();
            $snippet->testers()->attach(collect($testers)->map(fn (string $t) => $u[$t]->id));
        }

        // Passeport de fiabilité des extraits de démonstration (informations issues des documentations publiques des API)
        $passports = [
            'Initier un paiement PayTech' => ['API PayTech · payment/request-payment', 'Clés API_KEY et API_SECRET de l\'espace PayTech ; Node.js 18 ou plus (fetch intégré).', 'Mode test de PayTech (env=test).', 'Montant entier en XOF. Le paiement n\'est confirmé que par la notification IPN, jamais par le seul retour du navigateur.'],
            'Demander un paiement MTN MoMo' => ['MTN MoMo Collection API v1_0 · requesttopay', 'Python 3 et la bibliothèque requests ; clé d\'abonnement et jeton d\'accès de MoMo Developer.', 'Sandbox MTN MoMo Developer.', 'La sandbox utilise l\'euro ; en production, la devise et l\'environnement cible dépendent du pays.'],
            'Obtenir un token Orange Money' => ['API Orange Developer · OAuth 2.0 (client credentials)', 'Identifiants de l\'application Orange Developer ; Node.js 18 ou plus.', 'Compte développeur Orange.', 'Le jeton expire : le garder en cache et le renouveler avant l\'échéance. Les adresses d\'API varient selon le pays.'],
            'Créer un paiement Wave Checkout' => ['Wave Checkout API v1 · checkout/sessions', 'Laravel 10 ou plus (client HTTP intégré) ; clé API Wave Business.', 'Compte Wave Business.', 'Montant entier en XOF. Vérifier la signature des webhooks avant de marquer une commande comme payée.'],
        ];
        foreach ($passports as $title => [$version, $requirements, $environment, $limitations]) {
            Snippet::where('title', $title)->update(['api_version' => $version, 'requirements' => $requirements, 'environment' => $environment, 'license' => 'MIT', 'limitations' => $limitations]);
        }
    }

    private function seedWallet(): void
    {
        $mareme = $this->users['mareme'];
        $mareme->forceFill(['wallet_balance' => 2500, 'wallet_held' => 1000])->save();

        // Seul le sujet est enregistré : le front-end compose « Prime reçue · … » dans la langue choisie
        $history = [
            [9 * 1440, 'bounty_received', 1500, 'Pagination Laravel lente sur 50 000 lignes', null],
            [4 * 1440, 'bounty_received', 1000, 'Envoi de SMS OTP au Cameroun : quel fournisseur ?', null],
            [12, 'bounty_held', 1000, 'Webhook Wave : aucune notification reçue en production', 'wave'],
        ];
        foreach ($history as [$minutesAgo, $type, $amount, $label, $method]) {
            $date = Carbon::now()->subMinutes($minutesAgo);
            $tx = $mareme->walletTransactions()->make(['type' => $type, 'amount' => $amount, 'label' => $label, 'payment_method' => $method]);
            $tx->forceFill(['created_at' => $date, 'updated_at' => $date])->save();
        }
    }

    /** Salons « Sous l'arbre », une conversation privée et les notifications de Mareme */
    private function seedMessaging(): void
    {
        $u = $this->users;

        $topics = [
            ['general', '#général', 'Tout ce qui touche à la vie de développeur en Afrique'],
            ['wave', '#wave', 'Intégration de Wave : paiements, webhooks, remboursements'],
            ['orange-money', '#orange-money', "L'API Orange Money, pays par pays"],
            ['mtn-momo', '#mtn-momo', 'MTN Mobile Money : sandbox et production'],
            ['paytech', '#paytech', 'PayTech et les agrégateurs de paiement'],
            ['laravel', '#laravel', 'Laravel, PHP et hébergement'],
            ['react', '#react', 'React, React Native et le front-end'],
            ['flutter', '#flutter', 'Flutter et les applications mobiles'],
        ];
        $countries = [
            ['senegal', '#sénégal', 'SN'], ['cote-d-ivoire', "#côte-d'ivoire", 'CI'], ['cameroun', '#cameroun', 'CM'],
            ['maroc', '#maroc', 'MA'], ['burkina-faso', '#burkina-faso', 'BF'], ['mali', '#mali', 'ML'],
        ];
        $rooms = [];
        foreach ($topics as [$slug, $name, $description]) {
            $rooms[$slug] = Room::create(['slug' => $slug, 'name' => $name, 'kind' => Room::TOPIC, 'description' => $description]);
        }
        foreach ($countries as [$slug, $name, $code]) {
            $rooms[$slug] = Room::create(['slug' => $slug, 'name' => $name, 'kind' => Room::COUNTRY, 'description' => 'Les développeurs '.config("palabre.countries.{$code}.name")]);
        }

        $chat = [
            ['general', 'fatou', 180, "Salut tout le monde ! Quelqu'un a un retour sur les VPS de Datacloud pour héberger du Laravel ?"],
            ['general', 'rodrigue', 170, "Oui, j'ai un 2 vCPU depuis six mois, aucune coupure. NGINX + PHP-FPM, ça tient bien."],
            ['general', 'awa', 160, 'Pareil à Abidjan. Pense juste à activer les sauvegardes automatiques.'],
            ['general', 'moussa', 30, 'Palabre vient de sortir, bienvenue aux nouveaux 👋'],
            ['wave', 'mariam', 240, "Quelqu'un a déjà géré un remboursement partiel avec l'API Wave ?"],
            ['wave', 'moussa', 230, "Oui : POST /v1/checkout/sessions/{id}/refund avec le montant. Attention, c'est irréversible."],
            ['wave', 'mariam', 225, 'Merci Moussa, je teste en sandbox d\'abord.'],
            ['wave', 'mareme', 20, 'Petit rappel pour les webhooks : la route doit être dans api.php, sinon erreur 419 !'],
            ['senegal', 'fatou', 600, 'Meetup Laravel Dakar le 18 octobre, qui vient ?'],
            ['senegal', 'moussa', 590, 'Présent !'],
        ];
        foreach ($chat as [$room, $author, $minutesAgo, $body]) {
            $date = Carbon::now()->subMinutes($minutesAgo);
            $message = $rooms[$room]->messages()->make(['body' => $body]);
            $message->forceFill(['user_id' => $u[$author]->id, 'created_at' => $date, 'updated_at' => $date])->save();
        }

        // Conversation privée Moussa ↔ Mareme autour de la prime Wave ; le dernier message n'est pas encore lu
        $conversation = Conversation::between($u['moussa'], $u['mareme']);
        $thread = [
            ['moussa', 10, "Salut Mareme ! Pour ton webhook Wave, regarde ma réponse : c'est le CSRF, j'ai eu exactement le même souci.", true],
            ['mareme', 8, 'Merci Moussa, je teste ça tout de suite 🙏', true],
            ['moussa', 3, 'Dis-moi si ça marche, je suis dispo ce soir 👍', false],
        ];
        foreach ($thread as [$sender, $minutesAgo, $body, $read]) {
            $date = Carbon::now()->subMinutes($minutesAgo);
            $message = $conversation->messages()->make(['body' => $body]);
            $message->forceFill(['sender_id' => $u[$sender]->id, 'read_at' => $read ? $date->copy()->addMinute() : null, 'created_at' => $date, 'updated_at' => $date])->save();
        }
        $conversation->forceFill(['last_message_at' => Carbon::now()->subMinutes(3)])->save();

        $u['mareme']->notify(new NewAnswer($this->moussaAnswer, $this->q1));
        $u['mareme']->notify(new NewDirectMessage($message, $u['moussa']));

        // Un groupe privé « Équipe Dakar » (Mareme administratrice) et quelques réactions
        $group = Room::create(['slug' => 'g-equipe-dakar', 'name' => 'Équipe Dakar', 'kind' => Room::GROUP, 'description' => null]);
        $group->forceFill(['is_private' => true, 'created_by' => $u['mareme']->id])->save();
        $group->members()->attach($u['mareme']->id, ['role' => Room::ROLE_ADMIN]);
        $group->members()->attach([$u['moussa']->id, $u['fatou']->id], ['role' => Room::ROLE_MEMBER]);
        foreach ([['mareme', 55, 'On se cale sur le meetup du 18 ? Je propose un atelier « webhooks sans douleur ».'], ['fatou', 40, 'Partante ! Je peux faire la partie paie et conformité.']] as [$author, $minutesAgo, $body]) {
            $date = Carbon::now()->subMinutes($minutesAgo);
            $m = $group->messages()->make(['body' => $body]);
            $m->forceFill(['user_id' => $u[$author]->id, 'created_at' => $date, 'updated_at' => $date])->save();
        }
        $rooms['wave']->messages()->where('user_id', $u['mareme']->id)->first()?->reactions()->createMany([
            ['user_id' => $u['moussa']->id, 'emoji' => '👍'],
            ['user_id' => $u['mariam']->id, 'emoji' => '🙏'],
        ]);
    }

    /** Davantage de questions réalistes : primes ouvertes, questions résolues, sujets propres à l'Afrique francophone */
    private function seedMoreQuestions(): void
    {
        $u = $this->users;

        $q = $this->question($u['aminata'], 50, 'Valider un numéro malien avant un paiement Orange Money', ['validation', 'orange-money', 'php'], 9, 130,
            "Mes utilisateurs à Bamako saisissent leur numéro de mille façons : `76 12 34 56`, `0022376123456`, `+223 76…`. Comment le valider et le normaliser avant d'appeler l'API de paiement ?",
            "Une question proche n'a pas encore de réponse validée. Normalisez le numéro au format international E.164 avant tout appel de paiement, et refusez-le côté serveur s'il n'est pas valide pour le pays.");
        $this->bounty($q, 1000, 'orange_money');
        $this->answer($q, $u['moussa'], 35, 6, <<<'MD'
            Utilise la bibliothèque **libphonenumber** (licence Apache-2.0) avec le pays par défaut `ML` :

            ```php
            $util = \libphonenumber\PhoneNumberUtil::getInstance();
            $numero = $util->parse($saisie, 'ML');
            if (! $util->isValidNumber($numero)) {
                throw new InvalidArgumentException('Numéro invalide');
            }
            $e164 = $util->format($numero, \libphonenumber\PhoneNumberFormat::E164); // +22376123456
            ```

            Stocke toujours la version E.164, et affiche la version locale à l'utilisateur.
            MD);

        $q = $this->question($u['awa'], 400, 'Montants en FCFA : pourquoi éviter les nombres à virgule en JavaScript ?', ['javascript', 'fcfa', 'paiement'], 18, 420,
            "Mon panier affiche parfois `4249.999999` FCFA au lieu de 4 250. D'où vient le problème et comment l'éviter ?",
            "Les nombres à virgule flottante ne représentent pas exactement certaines valeurs. Pour de l'argent, calculez en entiers (le FCFA n'a pas de centimes) et formatez seulement à l'affichage.");
        $accepted = $this->answer($q, $u['fatou'], 380, 14, <<<'MD'
            Le FCFA n'a pas de centimes : calcule **toujours en entiers**, et formate seulement à l'affichage.

            ```js
            const fcfa = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
            const total = [1500, 2000, 750].reduce((s, n) => s + n, 0) // 4250, exact
            fcfa.format(total)
            ```

            Côté base de données, une colonne entière (`integer`), jamais `float`.
            MD);
        $q->forceFill(['accepted_answer_id' => $accepted->id])->save();

        $q = $this->question($u['mariam'], 700, "PayTech : l'IPN arrive en double, comment éviter de créditer deux fois ?", ['paytech', 'laravel', 'idempotence'], 15, 310,
            'Quand le réseau est lent, PayTech renvoie la notification IPN plusieurs fois et mon code crédite le client à chaque fois. Comment rendre le traitement sûr ?',
            "Rendez le traitement idempotent : une référence de commande unique, une vérification de l'état sous verrou dans une transaction, et un crédit seulement si la commande est encore en attente.");
        $accepted = $this->answer($q, $u['moussa'], 650, 12, <<<'MD'
            Rends le traitement **idempotent** : la même notification reçue dix fois ne doit créditer qu'une fois.

            ```php
            DB::transaction(function () use ($ref, $montant) {
                $commande = Commande::where('reference', $ref)->lockForUpdate()->firstOrFail();
                if ($commande->statut !== 'en_attente' || $commande->montant !== $montant) {
                    return; // déjà traitée, ou montant inattendu : on ignore
                }
                $commande->update(['statut' => 'payee']);
                $commande->client->increment('solde', $montant);
            });
            ```

            Et vérifie d'abord que la notification vient bien de PayTech (empreintes de tes clés), avant toute écriture.
            MD);
        $q->forceFill(['accepted_answer_id' => $accepted->id])->save();

        $q = $this->question($u['moussa'], 90, "Wave : vérifier la signature d'un webhook en PHP", ['wave', 'securite', 'php'], 11, 205,
            "Je veux m'assurer que les notifications reçues viennent bien de Wave et pas de quelqu'un qui appelle mon URL. Comment vérifier la signature ?",
            "Calculez un HMAC SHA-256 du corps brut de la requête avec le secret du webhook, comparez-le à la signature reçue avec une comparaison à temps constant, et suivez le format d'en-tête décrit dans la documentation Wave.");
        $this->bounty($q, 1000, 'wave');
        $this->answer($q, $u['yasmine'], 60, 5, <<<'MD'
            Le principe : recalculer la signature avec ton secret de webhook et comparer **à temps constant**.

            ```php
            $attendue = hash_hmac('sha256', $request->getContent(), config('services.wave.webhook_secret'));
            abort_unless(hash_equals($attendue, $signatureRecue), 401);
            ```

            Le format exact de l'en-tête (et l'éventuel horodatage inclus dans le calcul) est décrit dans la documentation Wave : suis-la à la lettre.
            MD);

        $this->question($u['yasmine'], 220, 'Paiement par carte au Maroc : passerelle locale ou internationale ?', ['paiement', 'maroc', 'carte'], 7, 160,
            'Je lance une boutique en ligne à Casablanca. Vaut-il mieux passer par une passerelle marocaine ou par un acteur international pour accepter les cartes ? Quels critères regarder ?',
            "Aucune question proche n'est encore résolue. Comparez les frais, les délais de reversement, la prise en charge du dirham et les exigences de conformité (3-D Secure) avant de choisir.");
        $this->bounty(Question::where('title', 'Paiement par carte au Maroc : passerelle locale ou internationale ?')->first(), 2000, 'card');

        // Questions déjà résolues par Mareme : primes reçues visibles dans son portefeuille et dans « Récemment versées »
        foreach ([
            [$u['rodrigue'], 4 * 1440 + 60, 'Envoi de SMS OTP au Cameroun : quel fournisseur ?', ['sms', 'cameroun', 'otp'], 1000, 'mtn_momo',
                'Je dois envoyer des codes à usage unique à des utilisateurs de Douala et Yaoundé. Quels fournisseurs proposent une API fiable, et comment limiter les abus ?',
                "Choisis un fournisseur qui a des accords directs avec les opérateurs camerounais, et limite les envois : un code toutes les 30 secondes et cinq essais par code au plus. Garde seulement l'empreinte du code, jamais le code en clair."],
            [$u['fatou'], 9 * 1440 + 60, 'Pagination Laravel lente sur 50 000 lignes', ['laravel', 'postgresql', 'performance'], 1500, 'wave',
                "Ma liste de factures met plusieurs secondes à s'afficher dès qu'on dépasse la page 100. Comment accélérer la pagination ?",
                "Passe à la pagination par curseur (`cursorPaginate`) au lieu d'`OFFSET`, et ajoute un index sur la colonne de tri : PostgreSQL n'a plus à parcourir toutes les lignes précédentes."],
        ] as [$author, $minutesAgo, $title, $tags, $amount, $method, $body, $reply]) {
            $q = $this->question($author, $minutesAgo, $title, $tags, 13, 280, $body, 'Une première piste : cherchez dans les questions résolues proches, et précisez votre volume de données et votre version.');
            $answer = $this->answer($q, $u['mareme'], $minutesAgo - 30, 9, $reply);
            $q->forceFill(['accepted_answer_id' => $answer->id])->save();
            $q->bounty()->create(['amount' => $amount, 'payment_method' => $method, 'expires_at' => now()->subDays(1)])
                ->forceFill(['status' => 'paid', 'paid_to_user_id' => $u['mareme']->id, 'paid_at' => Carbon::now()->subMinutes($minutesAgo - 40)])->save();
        }
    }

    /** Trois extraits supplémentaires, documentés par leur passeport */
    private function seedMoreSnippets(): void
    {
        $u = $this->users;
        $snippets = [
            ['fatou', 'Formater et additionner des montants en FCFA', 'Calculs exacts en entiers, affichage localisé avec Intl.', 'JavaScript', 'javascript', ['fcfa'], 22, ['awa', 'moussa'],
                ['ECMAScript Intl.NumberFormat · devise XOF', 'Aucun paquet : navigateur récent ou Node.js 18 ou plus.', 'Chrome, Firefox et Node.js 20.', "Le FCFA n'a pas de centimes : additionner des entiers, ne formater qu'à l'affichage. Le symbole affiché dépend de la langue."],
                <<<'JS'
                // Montants en entiers (FCFA) : jamais de nombres à virgule pour de l'argent
                const fcfa = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })

                const panier = [1500, 2000, 750]
                const total = panier.reduce((somme, montant) => somme + montant, 0) // 4250, exact

                console.log(fcfa.format(total))
                JS],
            ['moussa', 'Valider et normaliser un numéro de téléphone africain', 'Format international E.164 avant tout paiement mobile money.', 'PHP', 'php', ['orange-money', 'wave', 'mtn-momo'], 35, ['aminata', 'rodrigue', 'fatou'],
                ['libphonenumber-for-php 8.x · format E.164', 'composer require giggsey/libphonenumber-for-php (licence Apache-2.0) ; PHP 8.1 ou plus.', 'PHP 8.3 en ligne de commande.', "La bibliothèque doit être tenue à jour : les plans de numérotation changent. Le code pays par défaut doit être celui de l'utilisateur."],
                <<<'PHP'
                use libphonenumber\PhoneNumberFormat;
                use libphonenumber\PhoneNumberUtil;

                $util = PhoneNumberUtil::getInstance();
                $numero = $util->parse('77 123 45 67', 'SN'); // pays par défaut : Sénégal

                if (! $util->isValidNumber($numero)) {
                    throw new InvalidArgumentException('Numéro invalide');
                }

                echo $util->format($numero, PhoneNumberFormat::E164); // +221771234567
                PHP],
            ['awa', 'Requête robuste pour une connexion 3G instable', 'Délai maximal, nouvelles tentatives espacées, pas de réessai inutile.', 'JavaScript', 'javascript', ['reseau', 'mobile'], 29, ['yasmine', 'mariam'],
                ['API Fetch et AbortController (standard du web)', 'Aucun paquet : navigateur récent ou Node.js 18 ou plus.', 'Chrome sur Android, réseau limité en 3G dans les outils du navigateur.', 'À réserver aux requêtes sans effet de bord (lecture) ou rendues idempotentes côté serveur : sinon un paiement pourrait partir deux fois.'],
                <<<'JS'
                // Réessaie quand le réseau coupe, avec un délai qui double à chaque essai
                async function fetchRobuste(url, options = {}, essais = 3) {
                  for (let i = 0; i < essais; i++) {
                    const controle = new AbortController()
                    const minuteur = setTimeout(() => controle.abort(), 10000) // 10 s au plus par essai
                    try {
                      const reponse = await fetch(url, { ...options, signal: controle.signal })
                      if (reponse.status < 500) return reponse // une erreur 4xx ne se règle pas en réessayant
                    } catch (erreur) {
                      if (i === essais - 1) throw erreur
                    } finally {
                      clearTimeout(minuteur)
                    }
                    await new Promise((r) => setTimeout(r, 1000 * 2 ** i))
                  }
                  throw new Error('Serveur indisponible')
                }
                JS],
        ];

        foreach ($snippets as [$author, $title, $description, $language, $fence, $apis, $votes, $testers, [$version, $requirements, $environment, $limitations], $code]) {
            $snippet = new Snippet(compact('title', 'description', 'language', 'fence', 'apis', 'code') + ['api_version' => $version, 'requirements' => $requirements, 'environment' => $environment, 'license' => 'MIT', 'limitations' => $limitations]);
            $snippet->author()->associate($this->users[$author]);
            $snippet->forceFill(['votes' => $votes])->save();
            $snippet->testers()->attach(collect($testers)->map(fn (string $t) => $u[$t]->id));
        }
    }

    /** Une communauté vivante : plus de messages dans les salons, et une conversation d'équipe */
    private function seedMoreConversations(): void
    {
        $u = $this->users;
        $rooms = Room::whereIn('slug', ['orange-money', 'paytech', 'laravel', 'react', 'flutter', 'mtn-momo'])->get()->keyBy('slug');
        $chat = [
            ['orange-money', 'mariam', 300, "Rappel : le token Orange expire, gardez-le en cache au lieu d'en redemander un à chaque paiement."],
            ['orange-money', 'aminata', 280, "Merci ! Et pensez à normaliser les numéros en +223… avant l'appel, ça m'a évité plein d'erreurs."],
            ['paytech', 'moussa', 500, "Pour l'IPN PayTech : vérifiez les empreintes des clés AVANT toute écriture en base."],
            ['paytech', 'mariam', 480, 'Et une référence de commande unique, sinon double crédit garanti quand le réseau est lent 😅'],
            ['laravel', 'rodrigue', 900, "Astuce : `cursorPaginate()` au lieu d'`OFFSET` sur les grosses tables, c'est le jour et la nuit."],
            ['laravel', 'fatou', 880, 'Validé chez moi : la liste des factures est passée de 4 s à 80 ms.'],
            ['react', 'awa', 1200, "Quelqu'un a testé le mode hors ligne avec Workbox sur des téléphones d'entrée de gamme ?"],
            ['flutter', 'yasmine', 1300, 'Pensez à activer le mode release pour mesurer les performances, le mode debug ment beaucoup.'],
            ['mtn-momo', 'rodrigue', 260, 'En sandbox MoMo, le callback doit être en HTTPS public : utilisez un tunnel pour tester en local.'],
        ];
        foreach ($chat as [$room, $author, $minutesAgo, $body]) {
            if (! isset($rooms[$room])) {
                continue;
            }
            $date = Carbon::now()->subMinutes($minutesAgo);
            $message = $rooms[$room]->messages()->make(['body' => $body]);
            $message->forceFill(['user_id' => $u[$author]->id, 'created_at' => $date, 'updated_at' => $date])->save();
        }

        // Conversation d'équipe Mareme ↔ coéquipière
        $conversation = Conversation::between($u['mareme'], $u['mlletech']);
        foreach ([
            ['mlletech', 90, "J'ai relancé tous les tests ce matin : tout est vert ✅", true],
            ['mareme', 85, 'Top ! Tu peux vérifier le parcours mobile avant le tournage de la vidéo ?', true],
            ['mlletech', 80, "C'est fait, la barre d'onglets et le portefeuille passent bien sur téléphone 📱", true],
        ] as [$sender, $minutesAgo, $body, $read]) {
            $date = Carbon::now()->subMinutes($minutesAgo);
            $message = $conversation->messages()->make(['body' => $body]);
            $message->forceFill(['sender_id' => $u[$sender]->id, 'read_at' => $read ? $date->copy()->addMinute() : null, 'created_at' => $date, 'updated_at' => $date])->save();
        }
        $conversation->forceFill(['last_message_at' => Carbon::now()->subMinutes(80)])->save();
    }
}
