<?php

// Messages de validation en français (uniquement les règles utilisées par l'API Palabre)
return [
    'accepted' => 'Le champ :attribute doit être accepté.',
    'array' => 'Le champ :attribute doit être une liste.',
    'confirmed' => 'La confirmation du champ :attribute ne correspond pas.',
    'email' => 'Le champ :attribute doit être une adresse e-mail valide.',
    'in' => 'La valeur choisie pour :attribute n’est pas valide.',
    'integer' => 'Le champ :attribute doit être un nombre entier.',
    'max' => [
        'array' => 'Le champ :attribute ne peut pas contenir plus de :max éléments.',
        'string' => 'Le champ :attribute ne peut pas dépasser :max caractères.',
        'numeric' => 'Le champ :attribute ne peut pas dépasser :max.',
    ],
    'min' => [
        'array' => 'Le champ :attribute doit contenir au moins :min élément(s).',
        'string' => 'Le champ :attribute doit contenir au moins :min caractères.',
        'numeric' => 'Le champ :attribute doit valoir au moins :min.',
    ],
    'regex' => 'Le format du champ :attribute n’est pas valide.',
    'required' => 'Le champ :attribute est obligatoire.',
    'required_with' => 'Le champ :attribute est obligatoire quand :values est présent.',
    'string' => 'Le champ :attribute doit être un texte.',
    'unique' => 'Ce :attribute est déjà utilisé.',

    'attributes' => [
        'title' => 'titre',
        'body' => 'texte',
        'tags' => 'étiquettes',
        'tags.*' => 'étiquette',
        'bounty.amount' => 'montant de la prime',
        'bounty.method' => 'moyen de paiement',
        'value' => 'vote',
        'description' => 'description',
        'language' => 'langage',
        'fence' => 'langage de coloration',
        'code' => 'code',
        'amount' => 'montant',
        'method' => 'moyen de retrait',
        'account' => 'numéro ou RIB',
        'name' => 'nom',
        'email' => 'e-mail',
        'password' => 'mot de passe',
        'country' => 'pays',
        'city' => 'ville',
    ],
];
