<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MessageResource\Pages;
use App\Models\PortfolioMessage;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class MessageResource extends Resource
{
    protected static ?string $model = PortfolioMessage::class;

    protected static ?string $navigationLabel = 'Messages';

    protected static ?string $navigationIcon = 'heroicon-o-envelope';

    protected static ?string $navigationGroup = 'Content';

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist->schema([
            Infolists\Components\TextEntry::make('sender_name')->label('From'),
            Infolists\Components\TextEntry::make('sender_email')->label('Email'),
            Infolists\Components\TextEntry::make('message')->columnSpanFull(),
            Infolists\Components\TextEntry::make('created_at')->label('Received')->since(),
            Infolists\Components\TextEntry::make('read_at')->label('Read at')->placeholder('Unread'),
        ]);
    }

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('sender_name')->disabled(),
            Forms\Components\TextInput::make('sender_email')->disabled(),
            Forms\Components\Textarea::make('message')->disabled()->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('sender_name')->label('From')->searchable(),
                Tables\Columns\TextColumn::make('sender_email')->label('Email')->searchable(),
                Tables\Columns\TextColumn::make('message')->limit(60),
                Tables\Columns\IconColumn::make('read_at')->label('Read')->boolean()
                    ->getStateUsing(fn (PortfolioMessage $r) => $r->read_at !== null),
                Tables\Columns\TextColumn::make('created_at')->since()->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\Filter::make('unread')
                    ->query(fn ($query) => $query->whereNull('read_at'))
                    ->label('Unread only'),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\Action::make('markRead')
                    ->label('Mark Read')
                    ->icon('heroicon-o-check')
                    ->visible(fn (PortfolioMessage $r) => $r->read_at === null)
                    ->action(fn (PortfolioMessage $r) => $r->update(['read_at' => now()])),
                Tables\Actions\DeleteAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPortfolioMessages::route('/'),
            'view' => Pages\ViewPortfolioMessage::route('/{record}'),
        ];
    }
}
