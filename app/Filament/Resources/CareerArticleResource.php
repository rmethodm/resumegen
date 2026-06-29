<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CareerArticleResource\Pages;
use App\Models\CareerArticle;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class CareerArticleResource extends Resource
{
    protected static ?string $model = CareerArticle::class;

    protected static ?string $navigationIcon = 'heroicon-o-newspaper';

    protected static ?string $navigationGroup = 'Content';

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('title')->required()->maxLength(255)->columnSpanFull(),
            Forms\Components\TextInput::make('slug')->maxLength(255)->nullable(),
            Forms\Components\Select::make('category')
                ->options(array_combine(CareerArticle::CATEGORIES, CareerArticle::CATEGORIES))
                ->required(),
            Forms\Components\Textarea::make('meta_description')->maxLength(255)->nullable()->columnSpanFull(),
            Forms\Components\RichEditor::make('body')->required()->columnSpanFull(),
            Forms\Components\Toggle::make('is_published')->default(false),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('title')->searchable()->limit(60),
                Tables\Columns\TextColumn::make('category')->badge(),
                Tables\Columns\IconColumn::make('is_published')->boolean(),
                Tables\Columns\TextColumn::make('updated_at')->since()->sortable(),
            ])
            ->defaultSort('updated_at', 'desc')
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('togglePublish')
                    ->label(fn (CareerArticle $r) => $r->is_published ? 'Unpublish' : 'Publish')
                    ->icon(fn (CareerArticle $r) => $r->is_published ? 'heroicon-o-eye-slash' : 'heroicon-o-eye')
                    ->action(fn (CareerArticle $r) => $r->update(['is_published' => ! $r->is_published])),
                Tables\Actions\DeleteAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCareerArticles::route('/'),
            'create' => Pages\CreateCareerArticle::route('/create'),
            'edit' => Pages\EditCareerArticle::route('/{record}/edit'),
        ];
    }
}
