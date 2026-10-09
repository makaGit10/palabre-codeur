<x-mail::message>
# {{ __("Bienvenue sous l'arbre, :name !", ['name' => $user->name]) }}

{{ __('Voici votre code de vérification. Il expire dans :minutes minutes.', ['minutes' => $minutes]) }}

<x-mail::panel>
<p style="text-align:center;font-size:34px;letter-spacing:12px;font-weight:700;margin:0;font-family:Consolas,Menlo,monospace;color:#0E6B4E">{{ $code }}</p>
</x-mail::panel>

{{ __("Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet e-mail.") }}

{{ __('À bientôt sur Palabre,') }}<br>
{{ __("L'équipe Palabre") }}
</x-mail::message>
