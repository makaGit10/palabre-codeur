<x-mail::message>
# {{ __('Bonjour :name,', ['name' => $user->name]) }}

{{ __('Vous avez demandé un nouveau mot de passe. Voici votre code, valable :minutes minutes :', ['minutes' => $minutes]) }}

<x-mail::panel>
<p style="text-align:center;font-size:34px;letter-spacing:12px;font-weight:700;margin:0;font-family:Consolas,Menlo,monospace;color:#0E6B4E">{{ $code }}</p>
</x-mail::panel>

{{ __("Si vous n'avez rien demandé, ignorez cet e-mail : votre mot de passe reste inchangé.") }}

{{ __('À bientôt sur Palabre,') }}<br>
{{ __("L'équipe Palabre") }}
</x-mail::message>
