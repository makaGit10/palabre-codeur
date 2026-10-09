<?php

// Règles métier de Palabre, réunies au même endroit.
return [

    // Les 26 pays d'Afrique francophone : nom, monnaie, moyens de paiement et de retrait disponibles.
    // Liste des moyens à confirmer avec l'agrégateur de paiement retenu.
    'countries' => [
        'SN' => ['name' => 'Sénégal', 'currency' => 'XOF', 'methods' => ['wave', 'orange_money', 'free_money', 'card']],
        'CI' => ['name' => "Côte d'Ivoire", 'currency' => 'XOF', 'methods' => ['wave', 'orange_money', 'mtn_momo', 'moov_money', 'card']],
        'ML' => ['name' => 'Mali', 'currency' => 'XOF', 'methods' => ['wave', 'orange_money', 'moov_money', 'card']],
        'BF' => ['name' => 'Burkina Faso', 'currency' => 'XOF', 'methods' => ['wave', 'orange_money', 'moov_money', 'card']],
        'CM' => ['name' => 'Cameroun', 'currency' => 'XAF', 'methods' => ['mtn_momo', 'orange_money', 'card']],
        'MA' => ['name' => 'Maroc', 'currency' => 'MAD', 'methods' => ['card', 'bank_transfer']],
        'NE' => ['name' => 'Niger', 'currency' => 'XOF', 'methods' => ['airtel_money', 'moov_money', 'card']],
        'BJ' => ['name' => 'Bénin', 'currency' => 'XOF', 'methods' => ['mtn_momo', 'moov_money', 'card']],
        'TG' => ['name' => 'Togo', 'currency' => 'XOF', 'methods' => ['flooz', 'tmoney', 'card']],
        'GN' => ['name' => 'Guinée', 'currency' => 'GNF', 'methods' => ['orange_money', 'mtn_momo', 'card']],
        'MR' => ['name' => 'Mauritanie', 'currency' => 'MRU', 'methods' => ['card', 'bank_transfer']],
        'GA' => ['name' => 'Gabon', 'currency' => 'XAF', 'methods' => ['airtel_money', 'moov_money', 'card']],
        'CG' => ['name' => 'Congo', 'currency' => 'XAF', 'methods' => ['mtn_momo', 'airtel_money', 'card']],
        'CD' => ['name' => 'RD Congo', 'currency' => 'CDF', 'methods' => ['mpesa', 'orange_money', 'airtel_money', 'card']],
        'TD' => ['name' => 'Tchad', 'currency' => 'XAF', 'methods' => ['airtel_money', 'moov_money', 'card']],
        'CF' => ['name' => 'Centrafrique', 'currency' => 'XAF', 'methods' => ['orange_money', 'card', 'bank_transfer']],
        'GQ' => ['name' => 'Guinée équatoriale', 'currency' => 'XAF', 'methods' => ['card', 'bank_transfer']],
        'DZ' => ['name' => 'Algérie', 'currency' => 'DZD', 'methods' => ['card', 'bank_transfer']],
        'TN' => ['name' => 'Tunisie', 'currency' => 'TND', 'methods' => ['card', 'bank_transfer']],
        'MG' => ['name' => 'Madagascar', 'currency' => 'MGA', 'methods' => ['mvola', 'orange_money', 'airtel_money', 'card']],
        'KM' => ['name' => 'Comores', 'currency' => 'KMF', 'methods' => ['card', 'bank_transfer']],
        'DJ' => ['name' => 'Djibouti', 'currency' => 'DJF', 'methods' => ['card', 'bank_transfer']],
        'RW' => ['name' => 'Rwanda', 'currency' => 'RWF', 'methods' => ['mtn_momo', 'airtel_money', 'card']],
        'BI' => ['name' => 'Burundi', 'currency' => 'BIF', 'methods' => ['card', 'bank_transfer']],
        'MU' => ['name' => 'Maurice', 'currency' => 'MUR', 'methods' => ['card', 'bank_transfer']],
        'SC' => ['name' => 'Seychelles', 'currency' => 'SCR', 'methods' => ['card', 'bank_transfer']],
    ],

    'mobile_money' => ['wave', 'orange_money', 'free_money', 'mtn_momo', 'moov_money', 'airtel_money', 'mpesa', 'flooz', 'tmoney', 'mvola'],

    'bounty' => [
        'amounts' => [500, 1000, 2000], // FCFA
        'days_before_refund' => 7,
    ],

    // Messagerie : fenêtres de modification et de suppression, taille des groupes
    'messages' => [
        'edit_window_minutes' => 60,
        'delete_window_hours' => 24,
        'max_group_members' => 50,
        'reactions' => ['👍', '❤️', '😂', '🔥', '👏', '🤔', '🙏', '🎉'],
    ],

    'wallet' => [
        'min_withdrawal' => 1000, // FCFA
    ],

    // Comptes de démonstration créés par le seeder. En ligne, définir des mots de passe forts dans .env.
    'demo' => [
        'owner_email' => env('DEMO_OWNER_EMAIL', 'marememakalou10@gmail.com'),
        'teammate_email' => env('DEMO_TEAMMATE_EMAIL', 'njaayxaadim1312@gmail.com'),
        'password' => env('DEMO_PASSWORD', 'password'),
        // Comptes proposés sur la page de connexion (jury) quand DEMO_ACCOUNTS_PUBLIC=true : ceux de l'équipe.
        // Leur mot de passe (DEMO_PASSWORD) devient alors public, par choix, le temps du concours.
        'accounts_public' => (bool) env('DEMO_ACCOUNTS_PUBLIC', false),
        'public_accounts' => [env('DEMO_OWNER_EMAIL', 'marememakalou10@gmail.com'), env('DEMO_TEAMMATE_EMAIL', 'njaayxaadim1312@gmail.com')],
    ],

    // Points de réputation gagnés ou perdus
    'reputation' => [
        'question_upvoted' => 5,
        'answer_upvoted' => 10,
        'downvoted' => -2,
        'answer_accepted' => 15,
        'accepting_answer' => 2,
        'bounty_won' => 50,
    ],

    // Adresse du front-end : liens dans les e-mails (voir la question, mon portefeuille…)
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5180'),

    'features' => [
        // Vérification de l'adresse e-mail par code à l'inscription (false pour une démo sans serveur de mail)
        'email_verification' => (bool) env('EMAIL_VERIFICATION', true),
    ],

    // Codes à usage unique envoyés par e-mail (en minutes)
    'codes' => [
        'verification_minutes' => 2,
        'reset_minutes' => 10,
    ],

    // Connexion : après N échecs, le compte est bloqué M minutes et son titulaire est prévenu par e-mail
    'security' => [
        'login_attempts' => 5,
        'lock_minutes' => 30,
    ],

    // Libellés des moyens de paiement dans les e-mails
    'payment_labels' => [
        'wave' => 'Wave', 'orange_money' => 'Orange Money', 'free_money' => 'Free Money', 'mtn_momo' => 'MTN MoMo',
        'moov_money' => 'Moov Money', 'airtel_money' => 'Airtel Money', 'mpesa' => 'M-Pesa', 'flooz' => 'Flooz',
        'tmoney' => 'T-Money', 'mvola' => 'MVola', 'card' => 'carte bancaire', 'bank_transfer' => 'virement bancaire',
    ],
];
