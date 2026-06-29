<?php

namespace App\Filament\Pages;

use App\Models\AdminAuditLog;
use App\Models\AiRequest;
use App\Models\User;
use App\Services\UserLimits;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

class AiUsersPage extends Page
{
    protected static ?string $navigationLabel = 'AI Users';

    protected static ?string $navigationIcon = 'heroicon-o-users';

    protected static ?string $navigationGroup = 'Analytics';

    protected static string $view = 'filament.pages.ai-users-page';

    protected function getViewData(): array
    {
        $rows = AiRequest::query()
            ->selectRaw('user_id, COUNT(*) as requests, COALESCE(SUM(total_tokens),0) as tokens')
            ->selectRaw('COALESCE(SUM(estimated_cost_cents),0) as estimated_cost_cents')
            ->selectRaw("SUM(CASE WHEN status='flagged' THEN 1 ELSE 0 END) as flagged")
            ->selectRaw('MAX(created_at) as last_used')
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->orderByDesc('estimated_cost_cents')
            ->limit(100)
            ->get();

        $userIds = $rows->pluck('user_id')->filter()->all();
        $users = User::whereIn('id', $userIds)->get()->keyBy('id');

        $rows = $rows->map(function ($row) use ($users) {
            $user = $users->get($row->user_id);

            return [
                'id' => $row->user_id,
                'name' => $user?->name,
                'email' => $user?->email,
                'tier' => $user?->planTier(),
                'requests' => (int) $row->requests,
                'tokens' => (int) $row->tokens,
                'estimated_cost_cents' => (int) $row->estimated_cost_cents,
                'flagged' => (int) $row->flagged,
                'limit' => $user ? UserLimits::aiMonthlyLimit($user) : null,
                'used' => $user ? UserLimits::aiRequestsThisMonth($user) : null,
                'last_used' => $row->last_used,
            ];
        });

        return ['rows' => $rows];
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('resetQuota')
                ->label('Reset Quota')
                ->form([
                    TextInput::make('user_id')
                        ->label('User ID')
                        ->numeric()
                        ->required(),
                ])
                ->action(function (array $data) {
                    $user = User::findOrFail($data['user_id']);
                    $user->update(['ai_usage_reset_at' => now()]);
                    AdminAuditLog::record('ai.reset-quota', $user, "Reset monthly AI usage for {$user->email}");
                    Notification::make()->title('Quota reset.')->success()->send();
                }),
        ];
    }
}
