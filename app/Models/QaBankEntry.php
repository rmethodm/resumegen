<?php

namespace App\Models;

use Database\Factories\QaBankEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A persona Q&A entry used to autofill job-application forms — a saved
 * answer to a common application question, editable and AI-draftable.
 *
 * @property int $id
 * @property int $starter_profile_id
 * @property string $question
 * @property string|null $answer
 * @property int $position
 */
#[Fillable(['starter_profile_id', 'question', 'answer', 'position'])]
class QaBankEntry extends Model
{
    /** @use HasFactory<QaBankEntryFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<StarterProfile, $this>
     */
    public function starterProfile(): BelongsTo
    {
        return $this->belongsTo(StarterProfile::class);
    }
}
