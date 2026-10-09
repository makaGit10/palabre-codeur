<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Date de dernière modification par l'auteur (affichée « modifiée »), distincte de updated_at (votes, vues…)
return new class extends Migration
{
    public function up(): void
    {
        foreach (['questions', 'answers'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->timestamp('edited_at')->nullable());
        }
    }

    public function down(): void
    {
        foreach (['questions', 'answers'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn('edited_at'));
        }
    }
};
