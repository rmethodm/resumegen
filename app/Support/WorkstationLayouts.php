<?php

namespace App\Support;

/**
 * Valid `users.workstation_layout` values — the four Workstation layout
 * modes a user can switch between from the format toolbar.
 */
class WorkstationLayouts
{
    public const IDS = [
        'tabs',
        'overlay',
        'inline',
        'hybrid',
    ];
}
