<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProofreadingRequestResource\Pages;
use App\Models\ProofreadingRequest;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ProofreadingRequestResource extends Resource
{
    protected static ?string $model = ProofreadingRequest::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-magnifying-glass';

    protected static ?string $navigationGroup = 'Ops';

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist->schema([
            Infolists\Components\TextEntry::make('user.name')->label('Customer'),
            Infolists\Components\TextEntry::make('user.email')->label('Email'),
            Infolists\Components\TextEntry::make('resume.name')->label('Resume')->placeholder('No resume linked'),
            Infolists\Components\TextEntry::make('status')->badge(),
            Infolists\Components\TextEntry::make('price_cents')->label('Price')->money('usd'),
            Infolists\Components\TextEntry::make('feedback')->columnSpanFull()->placeholder('Not yet delivered'),
            Infolists\Components\TextEntry::make('created_at')->since(),
            Infolists\Components\TextEntry::make('completed_at')->since()->placeholder('Not completed'),
        ]);
    }

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Textarea::make('feedback')->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.name')->label('Customer')->searchable(),
                Tables\Columns\TextColumn::make('resume.name')->label('Resume')->placeholder('—'),
                Tables\Columns\TextColumn::make('status')->badge()->sortable(),
                Tables\Columns\TextColumn::make('price_cents')->label('Price')->money('usd'),
                Tables\Columns\TextColumn::make('created_at')->since()->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'pending' => 'Pending payment',
                        'paid' => 'Paid — awaiting review',
                        'completed' => 'Completed',
                    ]),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\Action::make('markCompleted')
                    ->label('Mark Completed')
                    ->icon('heroicon-o-check')
                    ->visible(fn (ProofreadingRequest $r) => $r->status === 'paid')
                    ->form([
                        Forms\Components\Textarea::make('feedback')
                            ->label('Feedback for customer')
                            ->required()
                            ->columnSpanFull(),
                    ])
                    ->action(fn (ProofreadingRequest $r, array $data) => $r->update([
                        'status' => 'completed',
                        'feedback' => $data['feedback'],
                        'completed_at' => now(),
                    ])),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListProofreadingRequests::route('/'),
            'view' => Pages\ViewProofreadingRequest::route('/{record}'),
        ];
    }
}
