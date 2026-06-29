<?php

namespace App\Filament\Resources\CareerArticleResource\Pages;

use App\Filament\Resources\CareerArticleResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListCareerArticles extends ListRecords
{
    protected static string $resource = CareerArticleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
