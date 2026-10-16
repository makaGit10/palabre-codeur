<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// « Passeport de fiabilité » d'un extrait : ce qu'il faut savoir avant de copier le code.
// La date de dernière vérification n'est pas stockée ici : c'est la dernière confirmation « Je l'ai testé » d'un membre.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('snippets', function (Blueprint $table) {
            $table->string('api_version', 120)->nullable(); // ex. « Wave Checkout API v1 »
            $table->string('requirements', 500)->nullable(); // prérequis et dépendances
            $table->string('environment', 160)->nullable(); // environnement dans lequel l'auteur l'a essayé
            $table->string('license', 20)->default('MIT');
            $table->string('limitations', 500)->nullable(); // limites connues
        });
    }

    public function down(): void
    {
        Schema::table('snippets', fn (Blueprint $table) => $table->dropColumn(['api_version', 'requirements', 'environment', 'license', 'limitations']));
    }
};
