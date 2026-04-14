<?php

namespace App\Enums;

enum PaymentType: string
{
    case Receivable = 'receivable';
    case Payable = 'payable';

    public function label(): string
    {
        return match ($this) {
            self::Receivable => 'Penerimaan Piutang',
            self::Payable => 'Pembayaran Hutang',
        };
    }
}
