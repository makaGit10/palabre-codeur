<?php

// Règles métier de Palabre, réunies au même endroit.
return [

    // Pays pris en charge : nom, monnaie, moyens de paiement et de retrait disponibles.
    // Liste des moyens à confirmer avec l'agrégateur de paiement retenu.
    'countries' => [
        'SN' => ['name' => 'Sénégal', 'currency' => 'XOF', 'methods' => ['wave', 'orange_money', 'free_money', 'card']],
        'CI' => ['name' => "Côte d'Ivoire", 'currency' => 'XOF', 'methods' => ['wave', 'orange_money', 'mtn_momo', 'moov_money', 'card']],
        'ML' => ['name' => 'Mali', 'currency' => 'XOF', 'methods' => ['wave', 'orange_money', 'moov_money', 'card']],
        'BF' => ['name' => 'Burkina Faso', 'currency' => 'XOF', 'methods' => ['wave', 'orange_money', 'moov_money', 'card']],
        'CM' => ['name' => 'Cameroun', 'currency' => 'XAF', 'methods' => ['mtn_momo', 'orange_money', 'card']],
        'MA' => ['name' => 'Maroc', 'currency' => 'MAD', 'methods' => ['card', 'bank_transfer']],
    ],

    'mobile_money' => ['wave', 'orange_money', 'free_money', 'mtn_momo', 'moov_money'],

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
        'owner_password' => env('DEMO_OWNER_PASSWORD', 'password'),
        'password' => env('DEMO_PASSWORD', 'password'),
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
];
