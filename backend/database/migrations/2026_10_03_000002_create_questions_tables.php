<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // pg_trgm : recherche de questions similaires (détection de doublons)
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 200);
            $table->text('body');
            $table->integer('votes')->default(0); // score mis en cache : somme des votes
            $table->unsignedInteger('views')->default(0);
            $table->timestamps();
            $table->index('created_at');
        });
        DB::statement('CREATE INDEX questions_title_trgm ON questions USING gin (title gin_trgm_ops)');

        Schema::create('answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->integer('votes')->default(0);
            $table->timestamps();
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->foreignId('accepted_answer_id')->nullable()->after('views')->constrained('answers')->nullOnDelete();
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('name', 40)->unique();
            $table->timestamps();
        });

        Schema::create('question_tag', function (Blueprint $table) {
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['question_id', 'tag_id']);
        });

        // Un seul vote par personne et par élément (question ou réponse)
        Schema::create('votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('votable');
            $table->smallInteger('value'); // -1 ou 1
            $table->timestamps();
            $table->unique(['user_id', 'votable_type', 'votable_id']);
        });

        Schema::create('ai_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->unique()->constrained()->cascadeOnDelete();
            $table->text('text');
            $table->string('model', 80)->nullable();
            $table->timestamps();
        });

        Schema::create('ai_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_suggestion_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('value', 4); // up | down
            $table->timestamps();
            $table->unique(['ai_suggestion_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_feedback');
        Schema::dropIfExists('ai_suggestions');
        Schema::dropIfExists('votes');
        Schema::dropIfExists('question_tag');
        Schema::dropIfExists('tags');
        Schema::table('questions', fn (Blueprint $table) => $table->dropConstrainedForeignId('accepted_answer_id'));
        Schema::dropIfExists('answers');
        Schema::dropIfExists('questions');
    }
};
