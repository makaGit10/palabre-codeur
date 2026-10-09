<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Recharges du portefeuille par PayTech : créées « en attente », créditées une seule fois à la confirmation (IPN)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_topups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('amount'); // FCFA
            $table->string('reference', 40)->unique(); // ref_command envoyée à PayTech
            $table->string('status', 10)->default('pending'); // pending | paid | canceled
            $table->string('provider_token')->nullable();
            $table->string('payment_method', 40)->nullable(); // moyen choisi chez PayTech, connu à la confirmation
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_topups');
    }
};
