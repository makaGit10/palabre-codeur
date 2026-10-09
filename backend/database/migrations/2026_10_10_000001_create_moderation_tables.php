<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Modération minimale : rôle administrateur, contenus masquables, signalements et journal des décisions
return new class extends Migration
{
    public function up(): void
    {
        // Jamais remplissable par une requête : attribué en base ou par « php artisan palabre:admin »
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false)->after('locale');
        });

        foreach (['questions', 'answers', 'snippets'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->timestamp('hidden_at')->nullable();
                $table->foreignId('hidden_by')->nullable()->constrained('users')->nullOnDelete();
            });
        }

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // qui signale
            $table->string('reportable_type', 20); // question | answer | snippet
            $table->unsignedBigInteger('reportable_id');
            $table->string('reason', 20); // spam | offensive | wrong | other
            $table->string('details', 500)->nullable();
            $table->string('status', 10)->default('open'); // open | hidden | dismissed
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'reportable_type', 'reportable_id']); // un signalement par personne et par contenu
            $table->index(['status', 'created_at']);
            $table->index(['reportable_type', 'reportable_id']);
        });

        Schema::create('moderation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 20); // hide | restore | dismiss
            $table->string('target_type', 20);
            $table->unsignedBigInteger('target_id');
            $table->string('note', 500)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moderation_logs');
        Schema::dropIfExists('reports');
        foreach (['questions', 'answers', 'snippets'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropConstrainedForeignId('hidden_by');
                $table->dropColumn('hidden_at');
            });
        }
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('is_admin'));
    }
};
