<?php

namespace App\Traits;

use App\Enums\TransactionStatus;

trait PreventsPostedDeletion
{
    public static function bootPreventsPostedDeletion(): void
    {
        static::deleting(function ($model) {
            if (! $model->isDeletable()) {
                throw new \LogicException(
                    'Tidak dapat menghapus record yang sudah diposting atau dibatalkan. Gunakan fitur void/batal.'
                );
            }
        });
    }

    public function isDeletable(): bool
    {
        if (! isset($this->status)) {
            return true;
        }

        $status = $this->status;

        if ($status instanceof TransactionStatus) {
            return $status === TransactionStatus::Draft;
        }

        return ! in_array($status, ['posted', 'voided'], true);
    }
}
