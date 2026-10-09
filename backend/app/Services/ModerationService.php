<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class ModerationService
{
    public function report(User $reporter, string $type, int $id, string $reason, ?string $details): Report
    {
        $target = $this->target($type, $id, publicOnly: true);
        if ($target->user_id === $reporter->id) {
            throw new BusinessRuleException(__('Vous ne pouvez pas signaler votre propre contenu.'));
        }

        $already = Report::where(['user_id' => $reporter->id, 'reportable_type' => $type, 'reportable_id' => $id])->exists();
        if ($already) {
            throw new BusinessRuleException(__("Vous avez déjà signalé ce contenu. Merci, la modération va l'examiner."));
        }

        try { // la contrainte d'unicité couvre aussi deux clics simultanés
            $report = new Report(['reportable_type' => $type, 'reportable_id' => $id, 'reason' => $reason, 'details' => $details]);
            $report->reporter()->associate($reporter)->save();

            return $report;
        } catch (UniqueConstraintViolationException) {
            throw new BusinessRuleException(__('Vous avez déjà signalé ce contenu. Merci, la modération va l\'examiner.'));
        }
    }

    /** Décision sur un signalement : masquer le contenu, ou classer sans suite. Tous les signalements du même contenu sont clos ensemble. */
    public function resolve(User $admin, Report $report, string $decision, ?string $note): void
    {
        DB::transaction(function () use ($admin, $report, $decision, $note) {
            if ($decision === 'hide') {
                $this->setHidden($admin, $report->reportable_type, $report->reportable_id, true, $note);
            } else {
                $this->log($admin, 'dismiss', $report->reportable_type, $report->reportable_id, $note);
            }
            Report::where('reportable_type', $report->reportable_type)
                ->where('reportable_id', $report->reportable_id)
                ->where('status', 'open')
                ->update(['status' => $decision === 'hide' ? 'hidden' : 'dismissed', 'resolved_by' => $admin->id, 'resolved_at' => now()]);
        });
    }

    public function setHidden(User $admin, string $type, int $id, bool $hidden, ?string $note = null): void
    {
        DB::transaction(function () use ($admin, $type, $id, $hidden, $note) {
            $target = $this->target($type, $id);
            $target->forceFill($hidden ? ['hidden_at' => now(), 'hidden_by' => $admin->id] : ['hidden_at' => null, 'hidden_by' => null])->save();
            $this->log($admin, $hidden ? 'hide' : 'restore', $type, $id, $note);
        });
    }

    private function target(string $type, int $id, bool $publicOnly = false): Model
    {
        $class = Report::TYPES[$type] ?? throw new BusinessRuleException(__('Type de contenu inconnu.'));
        $query = $publicOnly ? $class::query() : $class::withoutGlobalScope('visible');

        return $query->findOrFail($id);
    }

    private function log(User $admin, string $action, string $type, int $id, ?string $note): void
    {
        DB::table('moderation_logs')->insert([
            'admin_id' => $admin->id,
            'action' => $action,
            'target_type' => $type,
            'target_id' => $id,
            'note' => $note,
            'created_at' => now(),
        ]);
    }
}
