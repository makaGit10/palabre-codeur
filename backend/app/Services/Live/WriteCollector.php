<?php

namespace App\Services\Live;

use Illuminate\Database\Events\QueryExecuted;

/**
 * Observe les requêtes SQL d'une requête HTTP et retient les rubriques réellement écrites
 * (INSERT, UPDATE, DELETE), en ignorant les tables techniques et les colonnes techniques des membres.
 */
class WriteCollector
{
    /** @var array<string, true> */
    private array $topics = [];

    public function reset(): void
    {
        $this->topics = [];
    }

    public function record(QueryExecuted $query): void
    {
        if (! preg_match('/^\s*(insert\s+into|update|delete\s+from)\s+"?([a-z0-9_]+)"?/i', $query->sql, $m)) {
            return;
        }
        $table = strtolower($m[2]);
        $topics = config("palabre.live.tables.{$table}");
        if (! $topics) {
            return; // table technique ou sans rubrique (sessions, cache, journaux, notifications…)
        }
        if ($table === 'users' && stripos($m[1], 'update') === 0 && $this->onlyTechnicalColumns($query->sql)) {
            return; // connexion, langue, jeton « se souvenir de moi »… : rien à rafraîchir chez les autres
        }
        foreach ((array) $topics as $topic) {
            $this->topics[$topic] = true;
        }
    }

    /** @return list<string> */
    public function topics(): array
    {
        return array_keys($this->topics);
    }

    private function onlyTechnicalColumns(string $sql): bool
    {
        if (! preg_match('/\bset\s+(.+?)\s+where\b/is', $sql, $m)) {
            return false;
        }
        preg_match_all('/"([a-z0-9_]+)"\s*=/i', $m[1], $cols);
        $technical = config('palabre.live.technical_user_columns', []);

        return $cols[1] !== [] && array_diff(array_map('strtolower', $cols[1]), $technical) === [];
    }
}
