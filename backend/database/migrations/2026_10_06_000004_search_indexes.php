<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Recherche globale : index de similarité (trigrammes) sur ce que l'on cherche par le texte
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE INDEX IF NOT EXISTS snippets_title_trgm ON snippets USING gin (title gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS users_name_trgm ON users USING gin (name gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS rooms_name_trgm ON rooms USING gin (name gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS room_messages_body_trgm ON room_messages USING gin (body gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS direct_messages_body_trgm ON direct_messages USING gin (body gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS tags_name_trgm ON tags USING gin (name gin_trgm_ops)');
    }

    public function down(): void
    {
        foreach (['snippets_title_trgm', 'users_name_trgm', 'rooms_name_trgm', 'room_messages_body_trgm', 'direct_messages_body_trgm', 'tags_name_trgm'] as $index) {
            DB::statement("DROP INDEX IF EXISTS {$index}");
        }
    }
};
