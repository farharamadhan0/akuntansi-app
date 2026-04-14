<?php

namespace App\Traits;

use App\Models\JournalEntry;
use Illuminate\Database\Eloquent\Relations\MorphMany;

trait HasJournalEntries
{
    public function journalEntries(): MorphMany
    {
        return $this->morphMany(JournalEntry::class, 'source');
    }

    public function getLatestJournalEntry(): ?JournalEntry
    {
        return $this->journalEntries()->latest()->first();
    }
}
