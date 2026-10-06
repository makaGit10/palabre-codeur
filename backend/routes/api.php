<?php

use App\Http\Controllers\Api\AiFeedbackController;
use App\Http\Controllers\Api\AnswerController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommunityController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\SnippetController;
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
    Route::get('/users/{user}', [CommunityController::class, 'profile'])->whereNumber('user');
    Route::get('/rooms', [RoomController::class, 'index']);
    Route::get('/rooms/{room:slug}/messages', [RoomController::class, 'messages']);
});

// Inscription et connexion (cookie de session) : tentatives limitées contre le vol de mot de passe
Route::middleware('throttle:login')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// Son propre compte
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/wallet', [WalletController::class, 'show']);
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::get('/conversations/{user}', [ConversationController::class, 'show'])->whereNumber('user');
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read', [NotificationController::class, 'readAll']);
});

// Participation : compte obligatoire, et nombre d'écritures limité par personne
Route::middleware(['auth:sanctum', 'throttle:writes'])->group(function () {
    Route::post('/questions', [QuestionController::class, 'store']);
    Route::post('/questions/{question}/answers', [AnswerController::class, 'store']);
    Route::post('/questions/{question}/answers/{answer}/accept', [AnswerController::class, 'accept']);
    Route::post('/questions/{question}/vote', [VoteController::class, 'question']);
    Route::post('/answers/{answer}/vote', [VoteController::class, 'answer']);
    Route::post('/ai-suggestions/{suggestion}/feedback', [AiFeedbackController::class, 'store']);

    Route::post('/snippets', [SnippetController::class, 'store']);
    Route::post('/snippets/{snippet}/tested', [SnippetController::class, 'toggleTested']);

    Route::post('/wallet/withdrawals', [WalletController::class, 'withdraw']);

    Route::post('/rooms/{room:slug}/messages', [RoomController::class, 'store']);
    Route::post('/conversations/{user}/messages', [ConversationController::class, 'store'])->whereNumber('user');
});
