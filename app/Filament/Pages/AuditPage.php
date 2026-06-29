<?php

namespace App\Filament\Pages;

use App\Models\AdminAuditLog;
use Filament\Pages\Page;

class AuditPage extends Page
{
    protected static ?string $navigationLabel = 'Audit Log';

    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';

    protected static ?string $navigationGroup = 'Ops';

    protected static string $view = 'filament.pages.audit-page';

    protected function getViewData(): array
    {
        $logs = AdminAuditLog::with('admin:id,name,email')
            ->latest()
            ->paginate(50);

        return ['logs' => $logs];
    }
}
