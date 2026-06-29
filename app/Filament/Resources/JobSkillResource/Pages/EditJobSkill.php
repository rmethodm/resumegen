<?php

namespace App\Filament\Resources\JobSkillResource\Pages;

use App\Filament\Resources\JobSkillResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditJobSkill extends EditRecord
{
    protected static string $resource = JobSkillResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
