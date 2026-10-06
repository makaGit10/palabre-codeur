<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Messages modifiables (1 h) et supprimables pour tout le monde (24 h) : on garde la trace, pas le contenu
        foreach (['room_messages', 'direct_messages'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->timestamp('edited_at')->nullable()->after('attachment_id');
                $t->timestamp('deleted_at')->nullable()->after('edited_at');
            });
        }

        // Réactions emoji : une par personne, par message et par emoji
        Schema::create('message_reactions', function (Blueprint $table) {
            $table->id();
            $table->morphs('reactable'); // room_message | direct_message
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('emoji', 16);
            $table->timestamps();
            $table->unique(['reactable_type', 'reactable_id', 'user_id', 'emoji'], 'message_reactions_unique');
        });

        // Groupes : des salons privés avec des membres et un administrateur
        Schema::table('rooms', function (Blueprint $table) {
            $table->boolean('is_private')->default(false)->after('kind');
            $table->foreignId('created_by')->nullable()->after('is_private')->constrained('users')->nullOnDelete();
            $table->index('is_private');
        });

        Schema::create('room_user', function (Blueprint $table) {
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 10)->default('member'); // admin | member
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamp('last_read_at')->nullable(); // non-lus par groupe
            $table->primary(['room_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_user');
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropIndex(['is_private']);
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn('is_private');
        });
        Schema::dropIfExists('message_reactions');
        foreach (['room_messages', 'direct_messages'] as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn(['edited_at', 'deleted_at']));
        }
    }
};
