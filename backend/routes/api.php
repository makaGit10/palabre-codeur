<?php

use App\Http\Controllers\Api\AiFeedbackController;
use App\Http\Controllers\Api\AnswerController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommunityController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\DemoAccountController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\MembersController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\ModerationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\SnippetController;
use App\Http\Controllers\Api\TopupController;
use App\Http\Controllers\Api\UserSearchController;
use App\Http\Controllers\Api\VoteController;
use App\Http\Controllers\Api\WalletController;
use Illuminate\Support\Facades\Route;

// Lecture publique : tout le monde peut consulter Palabre sans compte
Route::middleware('throttle:api')->group(function () {
    Route::get('/questions', [QuestionController::class, 'index']);
    Route::get('/questions/similar', [QuestionController::class, 'similar']);
    Route::get('/questions/{question}', [QuestionController::class, 'show'])->whereNumber('question');
    Route::get('/snippets', [SnippetController::class, 'index']);
    Route::get('/leaderboard', [CommunityController::class, 'leaderboard']);
    Route::get('/stats', [CommunityController::class, 'stats']);
    Route::get('/demo-accounts', DemoAccountController::class); // comptes de démo, si DEMO_ACCOUNTS_PUBLIC=true
    Route::get('/users/{user}', [CommunityController::class, 'profile'])->whereNumber('user');
    Route::get('/rooms', [RoomController::class, 'index']);
    Route::get('/rooms/{room:slug}/messages', [RoomController::class, 'messages']);
    Route::get('/search', SearchController::class);
});

// Notification de paiement envoyée par PayTech (authentifiée par l'empreinte de nos clés, pas par une session)
Route::post('/paytech/ipn', [TopupController::class, 'ipn'])->middleware('throttle:api');

// Inscription et connexion (cookie de session) : tentatives limitées contre le vol de mot de passe
Route::middleware('throttle:login')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    // Mot de passe oublié : un code à 6 chiffres par e-mail, puis un nouveau mot de passe
    Route::post('/password/forgot', [PasswordResetController::class, 'forgot']);
    Route::post('/password/reset', [PasswordResetController::class, 'reset']);
});

// Son propre compte
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    // Vérification de l'adresse e-mail par code : 5 essais par code et 30 s entre deux envois, limités par le service
    Route::post('/email/verification/send', [EmailVerificationController::class, 'send']);
    Route::post('/email/verification/verify', [EmailVerificationController::class, 'verify']);
    Route::get('/wallet', [WalletController::class, 'show']);
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::get('/conversations/{user}', [ConversationController::class, 'show'])->whereNumber('user');
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read', [NotificationController::class, 'readAll']);
    Route::get('/groups/{room:slug}/members', [GroupController::class, 'members']);
    Route::get('/users/search', UserSearchController::class);
});

// Participation : compte obligatoire avec adresse e-mail vérifiée, et nombre d'écritures limité par personne
Route::middleware(['auth:sanctum', 'throttle:writes', 'verified.code'])->group(function () {
    Route::post('/questions', [QuestionController::class, 'store']);
    Route::patch('/questions/{question}', [QuestionController::class, 'update'])->whereNumber('question');
    Route::delete('/questions/{question}', [QuestionController::class, 'destroy'])->whereNumber('question');
    Route::patch('/answers/{answer}', [AnswerController::class, 'update'])->whereNumber('answer');
    Route::delete('/answers/{answer}', [AnswerController::class, 'destroy'])->whereNumber('answer');
    Route::patch('/me', [AuthController::class, 'updateProfile']);
    Route::post('/questions/{question}/answers', [AnswerController::class, 'store']);
    Route::post('/questions/{question}/answers/{answer}/accept', [AnswerController::class, 'accept']);
    Route::post('/questions/{question}/vote', [VoteController::class, 'question']);
    Route::post('/answers/{answer}/vote', [VoteController::class, 'answer']);
    Route::post('/ai-suggestions/{suggestion}/feedback', [AiFeedbackController::class, 'store']);

    Route::post('/snippets', [SnippetController::class, 'store']);
    Route::post('/snippets/{snippet}/tested', [SnippetController::class, 'toggleTested']);

    Route::post('/wallet/withdrawals', [WalletController::class, 'withdraw']);
    Route::post('/wallet/topups', [TopupController::class, 'store']);

    // Signaler un contenu (un signalement par personne et par contenu)
    Route::post('/reports', [ReportController::class, 'store']);

    Route::post('/rooms/{room:slug}/messages', [RoomController::class, 'store']);
    Route::post('/conversations/{user}/messages', [ConversationController::class, 'store'])->whereNumber('user');

    // Modifier, supprimer, réagir (type : room | direct)
    Route::patch('/messages/{type}/{id}', [MessageController::class, 'update'])->whereIn('type', ['room', 'direct'])->whereNumber('id');
    Route::delete('/messages/{type}/{id}', [MessageController::class, 'destroy'])->whereIn('type', ['room', 'direct'])->whereNumber('id');
    Route::post('/messages/{type}/{id}/reactions', [MessageController::class, 'react'])->whereIn('type', ['room', 'direct'])->whereNumber('id');

    // Groupes privés
    Route::post('/groups', [GroupController::class, 'store']);
    Route::post('/groups/{room:slug}/members', [GroupController::class, 'addMembers']);
    Route::delete('/groups/{room:slug}/members/me', [GroupController::class, 'leave']);
    Route::delete('/groups/{room:slug}/members/{user}', [GroupController::class, 'removeMember'])->whereNumber('user');
});

// Modération : administrateurs et modérateurs (vérifié côté serveur)
Route::middleware(['auth:sanctum', 'throttle:api', 'admin'])->prefix('admin')->group(function () {
    Route::get('/reports', [ModerationController::class, 'index']);
    Route::post('/reports/{report}/resolve', [ModerationController::class, 'resolve']);
    Route::post('/content/{type}/{id}/restore', [ModerationController::class, 'restore'])->whereIn('type', ['question', 'answer', 'snippet'])->whereNumber('id');
});

// Membres et rôles : administrateurs seulement
Route::middleware(['auth:sanctum', 'throttle:api', 'admin:manage'])->prefix('admin')->group(function () {
    Route::get('/members', [MembersController::class, 'index']);
    Route::post('/members', [MembersController::class, 'store']);
    Route::patch('/members/{user}/role', [MembersController::class, 'setRole'])->whereNumber('user');
});
