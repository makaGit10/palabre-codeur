<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Notifications\AnswerAccepted;
use App\Notifications\Channels\ResilientMailChannel;
use App\Notifications\NewAnswer;
use App\Notifications\WithdrawalMade;
use App\Services\QuestionService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MailNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_new_answer_and_an_accepted_answer_are_emailed(): void
    {
        Notification::fake();
        $asker = User::factory()->create(['country' => 'SN', 'locale' => 'fr']);
        $helper = User::factory()->create(['country' => 'SN', 'locale' => 'en']);
        $service = app(QuestionService::class);

        $question = $service->create($asker, ['title' => 'Webhook Wave muet en production', 'body' => 'Rien ne rentre.', 'tags' => ['wave'], 'bounty' => ['amount' => 1000, 'method' => 'wave']]);
        $answer = $service->answer($question, $helper, 'Vérifie la protection CSRF de la route.');

        Notification::assertSentTo($asker, NewAnswer::class, function (NewAnswer $n, array $channels) use ($asker) {
            return in_array(ResilientMailChannel::class, $channels, true) && str_contains($n->toMail($asker)->subject, 'a répondu à votre question');
        });

        $service->accept($question, $answer, $asker);
        Notification::assertSentTo($helper, AnswerAccepted::class, function (AnswerAccepted $n, array $channels) use ($helper) {
            return in_array(ResilientMailChannel::class, $channels, true) && str_contains($n->toMail($helper)->subject, '1 000 FCFA');
        });
    }

    public function test_a_withdrawal_sends_a_confirmation_email(): void
    {
        Notification::fake();
        $user = User::factory()->create(['country' => 'SN']);
        $user->forceFill(['wallet_balance' => 5000])->save();

        app(WalletService::class)->withdraw($user, 2000, 'wave', '77 123 45 67');

        Notification::assertSentTo($user, WithdrawalMade::class, function (WithdrawalMade $n) use ($user) {
            $mail = $n->toMail($user);

            return str_contains($mail->subject, '2 000 FCFA') && str_contains(implode(' ', $mail->introLines), '•••• 4567');
        });
    }
}
