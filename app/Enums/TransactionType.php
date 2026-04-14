<?php

namespace App\Enums;

enum TransactionType: string
{
    case Income = 'income';
    case Expense = 'expense';
    case Transfer = 'transfer';

    public function label(): string
    {
        return match ($this) {
            self::Income => 'Uang Masuk',
            self::Expense => 'Uang Keluar',
            self::Transfer => 'Transfer',
        };
    }
}
