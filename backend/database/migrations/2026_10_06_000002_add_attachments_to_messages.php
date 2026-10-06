<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Un message (salon ou privé) peut porter une pièce jointe : une question ou un extrait de code partagé
return new class extends Migration
{
    public function up(): void
    {
        foreach (['room_messages', 'direct_messages'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->string('attachment_type', 20)->nullable()->after('body'); // question | snippet
                $t->unsignedBigInteger('attachment_id')->nullable()->after('attachment_type');
            });
        }
    }

    public function down(): void
    {
        foreach (['room_messages', 'direct_messages'] as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn(['attachment_type', 'attachment_id']));
        }
    }
};
