<?php

namespace Tests\Feature\Api;

use App\Mail\AccountCreatedMail;
use App\Mail\PasswordResetCodeMail;
use App\Models\Question;
use App\Models\Report;
use App\Models\User;
use App\Services\MemberService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MembersTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $member;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['name' => 'Mareme MAKALOU', 'country' => 'SN']);
        $this->admin->forceFill(['is_admin' => true])->save();
        $this->member = User::factory()->create(['name' => 'Moussa Diop', 'email' => 'moussa@palabre.test', 'country' => 'SN']);
    }

    public function test_only_admins_see_members_and_moderators_only_moderate(): void
    {
        Sanctum::actingAs($this->member);
        $this->getJson('/api/admin/members')->assertForbidden();
        $this->getJson('/api/admin/reports')->assertForbidden();

        Sanctum::actingAs($this->admin);
        $this->patchJson("/api/admin/members/{$this->member->id}/role", ['role' => 'moderator'])->assertOk()->assertJsonPath('data.role', 'moderator');
        $this->assertDatabaseHas('moderation_logs', ['admin_id' => $this->admin->id, 'action' => 'role', 'target_type' => 'user', 'target_id' => $this->member->id, 'note' => 'member → moderator']);

        // Un modérateur traite les signalements mais ne touche pas aux membres
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($this->member->fresh());
        $this->getJson('/api/admin/reports')->assertOk();
        $this->getJson('/api/admin/members')->assertForbidden();
        $this->patchJson("/api/admin/members/{$this->admin->id}/role", ['role' => 'member'])->assertForbidden();
        $this->getJson('/api/me')->assertJsonPath('data.isModerator', true)->assertJsonPath('data.isAdmin', false);
    }

    public function test_an_admin_searches_members_and_cannot_change_their_own_role(): void
    {
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/admin/members?q=moussa')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.email', 'moussa@palabre.test');
        $this->getJson('/api/admin/members')->assertJsonPath('data.0.role', 'admin'); // responsables en premier
        $this->patchJson("/api/admin/members/{$this->admin->id}/role", ['role' => 'member'])->assertUnprocessable()
            ->assertJsonPath('message', 'Vous ne pouvez pas modifier votre propre rôle.');
        $this->patchJson("/api/admin/members/{$this->member->id}/role", ['role' => 'roi'])->assertUnprocessable();
    }

    public function test_the_last_admin_cannot_be_demoted(): void
    {
        $moderator = User::factory()->create();
        $moderator->forceFill(['is_moderator' => true])->save();

        $this->expectExceptionMessage('Impossible de retirer le dernier administrateur.');
        app(MemberService::class)->setRole($moderator, $this->admin, 'member');
    }

    public function test_an_admin_creates_an_account_and_the_person_sets_a_password_from_the_invitation(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/admin/members', ['name' => 'Awa Koné', 'email' => 'Awa@Exemple.com', 'country' => 'CI', 'city' => 'Abidjan', 'role' => 'moderator'])
            ->assertCreated()
            ->assertJsonPath('data.email', 'awa@exemple.com')
            ->assertJsonPath('data.role', 'moderator')
            ->assertJsonPath('data.emailVerified', true);
        Mail::assertSent(AccountCreatedMail::class, fn (AccountCreatedMail $m) => $m->hasTo('awa@exemple.com') && $m->role === 'moderator');
        $this->postJson('/api/admin/members', ['name' => 'Awa Koné', 'email' => 'awa@exemple.com', 'country' => 'CI', 'role' => 'member'])->assertUnprocessable();

        // L'invitée choisit son mot de passe par le parcours « mot de passe oublié »
        $this->app['auth']->forgetGuards();
        $spa = fn () => $this->withHeaders(['Origin' => 'http://localhost:5180', 'Referer' => 'http://localhost:5180/']);
        $spa()->postJson('/api/password/forgot', ['email' => 'awa@exemple.com'])->assertOk();
        $code = null;
        Mail::assertSent(PasswordResetCodeMail::class, function (PasswordResetCodeMail $m) use (&$code) {
            $code = $m->code;

            return true;
        });
        $spa()->postJson('/api/password/reset', ['email' => 'awa@exemple.com', 'code' => $code, 'password' => 'motdepasse2026'])->assertOk()->assertJsonPath('data.isModerator', true);
    }

    public function test_a_moderator_can_hide_reported_content(): void
    {
        $moderator = User::factory()->create(['country' => 'SN']);
        $moderator->forceFill(['is_moderator' => true])->save();
        $question = new Question(['title' => 'Achetez des abonnés ici', 'body' => 'Publicité.']);
        $question->author()->associate($this->member)->save();
        $report = new Report(['reportable_type' => 'question', 'reportable_id' => $question->id, 'reason' => 'spam']);
        $report->reporter()->associate($this->admin)->save();

        Sanctum::actingAs($moderator);
        $this->postJson("/api/admin/reports/{$report->id}/resolve", ['decision' => 'hide'])->assertOk();
        $this->getJson("/api/questions/{$question->id}")->assertNotFound();
    }
}
