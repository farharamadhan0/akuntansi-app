<?php

namespace App\Enums;

enum CashBankType: string
{
    case Cash = 'cash';
    case Bank = 'bank';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Kas',
            self::Bank => 'Bank',
        };
    }
}
