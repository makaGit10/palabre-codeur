<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->char('country', 2)->default('SN')->after('email');
            $table->string('city', 80)->nullable()->after('country');
            $table->unsignedInteger('reputation')->default(1)->after('city');
            // Montants en FCFA (1 crédit Palabre = 1 FCFA), toujours des entiers
            $table->unsignedBigInteger('bounty_earnings')->default(0)->after('reputation');
            $table->unsignedBigInteger('wallet_balance')->default(0)->after('bounty_earnings');
            $table->unsignedBigInteger('wallet_held')->default(0)->after('wallet_balance');
            $table->index('country');
            $table->index('reputation');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['country']);
            $table->dropIndex(['reputation']);
            $table->dropColumn(['country', 'city', 'reputation', 'bounty_earnings', 'wallet_balance', 'wallet_held']);
        });
    }
};
