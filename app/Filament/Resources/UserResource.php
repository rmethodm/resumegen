<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Models\AdminAuditLog;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';

    protected static ?string $navigationGroup = 'Users';

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')->required()->maxLength(255),
            Forms\Components\TextInput::make('email')->email()->required()->maxLength(255),
            Forms\Components\Toggle::make('ai_blocked')->label('AI Blocked'),
            Forms\Components\TextInput::make('ai_limit_override')
                ->label('AI Limit Override')
                ->numeric()
                ->nullable(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('email')->searchable()->sortable(),
                Tables\Columns\IconColumn::make('email_verified_at')->label('Verified')->boolean()
                    ->getStateUsing(fn (User $r) => $r->email_verified_at !== null),
                Tables\Columns\TextColumn::make('created_at')->since()->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->after(function (User $record, array $data) {
                        AdminAuditLog::record('user.edit', $record, "Edited user {$record->email}", $data);
                    }),
                Tables\Actions\Action::make('impersonate')
                    ->label('Impersonate')
                    ->icon('heroicon-o-eye')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->visible(fn (User $record): bool => ! $record->is_master_admin && $record->id !== Auth::id())
                    ->action(function (User $record) {
                        if ($record->is_master_admin || $record->id === Auth::id()) {
                            abort(403);
                        }
                        session([
                            'impersonating_id' => $record->id,
                            'impersonator_id' => Auth::id(),
                        ]);
                        AdminAuditLog::record('user.impersonate', $record, "Impersonating {$record->email}");
                        Auth::login($record);
                        session()->regenerate();

                        return redirect(route('dashboard'));
                    }),
                Tables\Actions\DeleteAction::make()
                    ->before(function (User $record) {
                        if ($record->is_master_admin) {
                            throw new \Exception('Cannot delete a master admin.');
                        }
                        AdminAuditLog::record('user.delete', $record, "Deleted user {$record->email}", ['name' => $record->name]);
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()
                        ->before(function (Collection $records) {
                            foreach ($records as $record) {
                                if ($record->is_master_admin) {
                                    throw new \Exception("Cannot delete master admin: {$record->email}");
                                }
                                AdminAuditLog::record('user.delete', $record, "Bulk deleted user {$record->email}", ['name' => $record->name]);
                            }
                        }),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }
}
