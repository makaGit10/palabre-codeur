<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('snippets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 150);
            $table->string('description', 300);
            $table->string('language', 60); // libellé libre : « PHP · Laravel », « Rust »…
            $table->string('fence', 30); // nom utilisé pour la coloration du code
            $table->jsonb('apis'); // ex. ["wave", "orange-money", "moov-money"]
            $table->text('code');
            $table->integer('votes')->default(0);
            $table->timestamps();
        });

        // « Je l'ai testé » : une confirmation par personne et par snippet
        Schema::create('snippet_tests', function (Blueprint $table) {
            $table->foreignId('snippet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['snippet_id', 'user_id']);
        });

        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 40)->unique();
            $table->string('icon', 8);
            $table->string('label', 60);
            $table->timestamps();
        });

        Schema::create('badge_user', function (Blueprint $table) {
            $table->foreignId('badge_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('awarded_at')->useCurrent();
            $table->primary(['badge_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('badge_user');
        Schema::dropIfExists('badges');
        Schema::dropIfExists('snippet_tests');
        Schema::dropIfExists('snippets');
    }
};
