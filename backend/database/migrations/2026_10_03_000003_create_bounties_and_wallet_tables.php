<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Prime attachée à une question : bloquée (held) → versée (paid) ou remboursée (refunded)
        Schema::create('bounties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('amount'); // FCFA
            $table->string('payment_method', 20);
            $table->string('status', 10)->default('held');
            $table->foreignId('paid_to_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->index(['status', 'expires_at']);
        });

        // Historique du portefeuille : chaque mouvement est tracé (audit)
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // bounty_received | bounty_held | bounty_paid | withdrawal
            $table->unsignedBigInteger('amount'); // FCFA
            $table->string('label');
            $table->string('payment_method', 20)->nullable();
            $table->string('account_masked', 40)->nullable(); // jamais le numéro complet
            $table->string('provider_reference')->nullable(); // référence chez l'agrégateur de paiement
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('bounties');
    }
};
