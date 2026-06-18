<?php

// Ensure the application uses this worktree as its base path,
// even when vendor/ is symlinked to the parent repo.
$_ENV['APP_BASE_PATH'] = dirname(__DIR__);
$_SERVER['APP_BASE_PATH'] = dirname(__DIR__);

require dirname(__DIR__).'/vendor/autoload.php';
