<x-mail::message>
# {{ __("Bienvenue sous l'arbre, :name !", ['name' => $user->name]) }}

{{ __(':creator vous a créé un compte sur Palabre, avec le rôle de :role.', ['creator' => $creator->name, 'role' => $roleLabel]) }}

{{ __('Pour choisir votre mot de passe, demandez un code avec le bouton ci-dessous, puis saisissez-le avec votre nouveau mot de passe.') }}

<x-mail::button :url="$resetUrl" color="primary">
{{ __('Choisir mon mot de passe') }}
</x-mail::button>

{{ __('Votre identifiant est votre adresse e-mail : :email', ['email' => $user->email]) }}

{{ __('À bientôt sur Palabre,') }}<br>
{{ __("L'équipe Palabre") }}
</x-mail::message>
