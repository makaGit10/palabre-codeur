<?php

namespace App\Providers;

use App\Payments\PaymentGateway;
use App\Payments\SandboxGateway;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Paiements simulés pendant le concours ; un vrai agrégateur implémentera la même interface
        $this->app->bind(PaymentGateway::class, SandboxGateway::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // En développement, signale les requêtes oubliées en boucle (problème « N+1 »)
        Model::preventLazyLoading(! $this->app->isProduction());

        // Lecture : 120 requêtes par minute ; écriture : 30 par minute et par personne (anti-spam)
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('writes', fn (Request $request) => Limit::perMinute(30)->by($request->user()?->id ?: $request->ip()));
        // Connexion : 5 essais par minute pour une même adresse e-mail depuis une même adresse IP
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)->by(mb_strtolower((string) $request->input('email')).'|'.$request->ip()));
    }
}
