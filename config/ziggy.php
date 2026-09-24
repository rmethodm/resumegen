<?php

/*
 * @routes publishes route names and URIs into every page, guests included.
 * Keep the admin surface and dev-tooling routes out of that public map;
 * admins get the `admin` group instead (see resources/views/app.blade.php),
 * because Pages/Admin/Schedule.tsx calls route('admin.schedule.update').
 *
 * Local-only routes (dev.*, shadcn.demo, projects.issues.*) are not listed:
 * outside local they are never registered, and locally the nav probes them
 * with route().has().
 */
return [
    'except' => [
        'admin.*',
        'debugbar.*',
        'boost.*',
    ],

    'groups' => [
        'admin' => [
            '*',
            '!debugbar.*',
            '!boost.*',
        ],
    ],
];
