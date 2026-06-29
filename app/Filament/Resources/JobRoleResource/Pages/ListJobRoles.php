<?php

namespace App\Filament\Resources\JobRoleResource\Pages;

use App\Filament\Resources\JobRoleResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListJobRoles extends ListRecords
{
    protected static string $resource = JobRoleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
