<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Mail\AccountCreatedMail;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

/**
 * Gestion des membres par les administrateurs : rôles (membre, modérateur, administrateur) et création de comptes.
 * Garde-fous : on ne change pas son propre rôle, le dernier administrateur ne peut pas être rétrogradé,
 * et chaque changement est inscrit dans le journal de modération.
 */
class MemberService
{
    public const ROLES = ['member', 'moderator', 'admin'];

    public static function roleOf(User $user): string
    {
        return $user->is_admin ? 'admin' : ($user->is_moderator ? 'moderator' : 'member');
    }

    public function setRole(User $actor, User $target, string $role): void
    {
        if ($target->id === $actor->id) {
            throw new BusinessRuleException(__('Vous ne pouvez pas modifier votre propre rôle.'));
        }

        DB::transaction(function () use ($actor, $target, $role) {
            $target = User::lockForUpdate()->findOrFail($target->id);
            $before = self::roleOf($target);
            if ($before === $role) {
                return;
            }
            if ($before === 'admin' && User::where('is_admin', true)->count() <= 1) {
                throw new BusinessRuleException(__('Impossible de retirer le dernier administrateur.'));
            }
            $target->forceFill(['is_admin' => $role === 'admin', 'is_moderator' => $role === 'moderator'])->save();
            $this->log($actor, 'role', $target->id, "{$before} → {$role}");
        });
    }

    /**
     * Crée un compte au nom de la personne, déjà vérifié, avec un mot de passe aléatoire qu'elle remplacera
     * grâce à l'invitation reçue par e-mail (parcours « mot de passe oublié »).
     *
     * @param  array{name: string, email: string, country: string, city?: string|null, role: string}  $data
     */
    public function create(User $actor, array $data): User
    {
        $user = DB::transaction(function () use ($actor, $data) {
            $user = User::create([
                'name' => trim($data['name']),
                'email' => $data['email'],
                'password' => Str::random(40),
                'country' => $data['country'],
                'city' => isset($data['city']) ? trim((string) $data['city']) : null,
                'locale' => app()->getLocale(),
            ]);
            $user->forceFill(['email_verified_at' => now(), 'is_admin' => $data['role'] === 'admin', 'is_moderator' => $data['role'] === 'moderator'])->save();
            $this->log($actor, 'create', $user->id, "compte créé avec le rôle {$data['role']}");

            return $user;
        });

        try {
            Mail::to($user)->send(new AccountCreatedMail($user, $actor, $data['role']));
        } catch (Throwable $e) {
            Log::warning("Invitation non envoyée à {$user->email} : ".$e->getMessage());
        }

        return $user;
    }

    private function log(User $actor, string $action, int $userId, string $note): void
    {
        DB::table('moderation_logs')->insert([
            'admin_id' => $actor->id,
            'action' => $action,
            'target_type' => 'user',
            'target_id' => $userId,
            'note' => $note,
            'created_at' => now(),
        ]);
    }
}
