<?php

namespace App\Logging;

use Monolog\Logger;

class DatabaseCriticalLogger
{
    public function __invoke(array $config): Logger
    {
        return new Logger('database_critical', [
            new DatabaseCriticalLogHandler(),
        ]);
    }
}
