<?php

namespace App\Filament\Resources\CareerArticleResource\Pages;

use App\Filament\Resources\CareerArticleResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditCareerArticle extends EditRecord
{
    protected static string $resource = CareerArticleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
