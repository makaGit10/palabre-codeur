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
// Les mots de passe viennent de .env (DEMO_OWNER_PASSWORD, DEMO_PASSWORD) : jamais écrits dans le code publié.
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
        $this->seedSnippets();
        $this->seedWallet();
        $this->seedMessaging();
    }

    private function seedUsers(): void
    {
        // En ligne, interdit de créer des comptes avec un mot de passe vide ou « password »
        $weak = fn (?string $p) => in_array($p, [null, '', 'password'], true);
        if (app()->isProduction() && ($weak(config('palabre.demo.owner_password')) || $weak(config('palabre.demo.password')))) {
            throw new \RuntimeException('Définissez DEMO_OWNER_PASSWORD et DEMO_PASSWORD (mots de passe forts) dans .env avant de lancer le seeder.');
        }

        $people = [
            'mareme' => ['Mareme MAKALOU', 'SN', 'Dakar', 1240, 2500],
            'moussa' => ['Moussa Diop', 'SN', 'Dakar', 3870, 6500],
            'fatou' => ['Fatou Ndiaye', 'SN', 'Thiès', 2950, 3000],
            'rodrigue' => ['Rodrigue Ntsama', 'CM', 'Douala', 2410, 1500],
            'yasmine' => ['Yasmine Benali', 'MA', 'Casablanca', 2105, 2000],
            'mariam' => ['Mariam Ouédraogo', 'BF', 'Ouagadougou', 1880, 500],
            'aminata' => ['Aminata Keïta', 'ML', 'Bamako', 990, 0],
            'awa' => ['Awa Koné', 'CI', 'Abidjan', 1610, 1000],
        ];

        foreach ($people as $key => [$name, $country, $city, $reputation, $earnings]) {
            $isOwner = $key === 'mareme';
            $user = User::create([
                'name' => $name,
                'email' => $isOwner ? config('palabre.demo.owner_email') : "{$key}@palabre.test",
                'password' => $isOwner ? config('palabre.demo.owner_password') : config('palabre.demo.password'),
                'country' => $country,
                'city' => $city,
            ]);
            // Colonnes protégées : modifiées directement, jamais via une requête
            $user->forceFill(['reputation' => $reputation, 'bounty_earnings' => $earnings])->save();
            $this->users[$key] = $user;
        }
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

    private function bounty(Question $question, int $amount, string $method): void
    {
        $question->bounty()->create(['amount' => $amount, 'payment_method' => $method, 'expires_at' => now()->addDays(7)]);
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
}
