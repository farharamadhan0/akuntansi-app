<?php

namespace App\Enums;

enum TransactionStatus: string
{
    case Draft = 'draft';
    case Posted = 'posted';
    case Voided = 'voided';
    case Corrected = 'corrected';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Posted => 'Diposting',
            self::Voided => 'Dibatalkan',
            self::Corrected => 'Dikoreksi',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Draft => 'gray',
            self::Posted => 'green',
            self::Voided => 'red',
            self::Corrected => 'amber',
        };
    }
}
