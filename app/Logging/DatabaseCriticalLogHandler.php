<?php

namespace App\Logging;

use App\Support\ErrorLogRecorder;
use Monolog\Handler\AbstractProcessingHandler;
use Monolog\Level;
use Monolog\LogRecord;

class DatabaseCriticalLogHandler extends AbstractProcessingHandler
{
    public function __construct()
    {
        parent::__construct(Level::Critical, true);
    }

    protected function write(LogRecord $record): void
    {
        app(ErrorLogRecorder::class)->recordMessage(
            $record->message,
            $record->level->getName(),
            $record->context
        );
    }
}
