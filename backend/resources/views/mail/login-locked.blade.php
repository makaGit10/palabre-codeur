<x-mail::message>
# {{ __('Bonjour :name,', ['name' => $user->name]) }}

{{ __('Nous avons bloqué les connexions à votre compte pendant :minutes minutes, après :attempts tentatives avec un mauvais mot de passe (le :when, depuis l\'adresse :ip).', ['minutes' => $minutes, 'attempts' => $attempts, 'when' => $when, 'ip' => $ip]) }}

{{ __("Si c'était vous, patientez simplement : votre compte sera de nouveau accessible ensuite.") }}

{{ __("Si ce n'était pas vous, choisissez un nouveau mot de passe dès maintenant :") }}

<x-mail::button :url="$resetUrl" color="primary">
{{ __('Changer mon mot de passe') }}
</x-mail::button>

{{ __('À bientôt sur Palabre,') }}<br>
{{ __("L'équipe Palabre") }}
</x-mail::message>
