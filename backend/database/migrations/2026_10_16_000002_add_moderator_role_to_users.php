<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Rôle intermédiaire : un modérateur traite les signalements, sans pouvoir gérer les membres ni nommer des administrateurs
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->boolean('is_moderator')->default(false)->after('is_admin'));
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('is_moderator'));
    }
};
