<?php

namespace App\Filament\Pages;

use App\Models\AdminAuditLog;
use App\Models\CoverLetter;
use App\Models\Resume;
use App\Models\User;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

class ContentPage extends Page
{
    protected static ?string $navigationLabel = 'Content Review';

    protected static ?string $navigationIcon = 'heroicon-o-document-text';

    protected static ?string $navigationGroup = 'Ops';

    protected static string $view = 'filament.pages.content-page';

    protected function getViewData(): array
    {
        $q = request()->query('q', '');

        $resumes = Resume::nonSnapshot()
            ->with('user:id,name,email')
            ->when($q, fn ($query) => $query->where(fn ($w) => $w
                ->where('name', 'like', "%{$q}%")
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$q}%"))
            ))
            ->latest()
            ->paginate(20, ['*'], 'resumes_page');

        $coverLetters = CoverLetter::with('user:id,name,email')
            ->when($q, fn ($query) => $query->where(fn ($w) => $w
                ->where('name', 'like', "%{$q}%")
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$q}%"))
            ))
            ->latest()
            ->paginate(20, ['*'], 'cl_page');

        return [
            'q' => $q,
            'resumes' => $resumes,
            'coverLetters' => $coverLetters,
            'counts' => [
                'resumes' => Resume::nonSnapshot()->count(),
                'coverLetters' => CoverLetter::count(),
                'portfolios' => User::whereNotNull('portfolio_slug')->count(),
            ],
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('deleteResume')
                ->label('Delete Resume by ID')
                ->color('danger')
                ->requiresConfirmation()
                ->form([
                    TextInput::make('resume_id')->label('Resume ID')->numeric()->required(),
                ])
                ->action(function (array $data) {
                    $resume = Resume::findOrFail($data['resume_id']);
                    AdminAuditLog::record('content.resume.delete', $resume, "Deleted resume \"{$resume->name}\" ({$resume->user?->email})");
                    $resume->delete();
                    Notification::make()->title('Resume deleted.')->success()->send();
                }),
        ];
    }
}
