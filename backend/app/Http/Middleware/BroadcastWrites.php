<?php

namespace App\Http\Middleware;

use App\Services\Live\LiveBroadcaster;
use App\Services\Live\WriteCollector;
use Closure;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Après une requête qui a réellement écrit en base (et seulement si elle a réussi), prévient les autres
 * navigateurs connectés. Un seul point d'envoi pour toute l'API ; l'envoi se fait après la réponse,
 * et son échec n'affecte jamais la requête de l'utilisateur.
 */
class BroadcastWrites
{
    public function __construct(private readonly WriteCollector $writes, private readonly LiveBroadcaster $live) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->writes->reset();
        if (! app()->bound('live.listening')) {
            app()->instance('live.listening', true);
            DB::listen(fn (QueryExecuted $query) => app(WriteCollector::class)->record($query));
        }

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if ($response->getStatusCode() >= 300) {
            return;
        }
        $topics = $this->writes->topics();
        if ($topics === []) {
            return;
        }
        $this->live->changed($topics, $request->user()?->id, $request->header('X-Socket-ID'));
    }
}
