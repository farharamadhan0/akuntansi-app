<?php

namespace App\Enums;

enum AccountType: string
{
    case Asset = 'asset';
    case Liability = 'liability';
    case Equity = 'equity';
    case Revenue = 'revenue';
    case Expense = 'expense';

    public function label(): string
    {
        return match ($this) {
            self::Asset => 'Aset',
            self::Liability => 'Kewajiban',
            self::Equity => 'Modal',
            self::Revenue => 'Pendapatan',
            self::Expense => 'Beban',
        };
    }

    public function normalBalance(): string
    {
        return match ($this) {
            self::Asset, self::Expense => 'debit',
            self::Liability, self::Equity, self::Revenue => 'credit',
        };
    }
}
