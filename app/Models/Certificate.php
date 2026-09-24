<?php

namespace App\Models;

use Database\Factories\CertificateFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Certificate extends Model
{
    /** @use HasFactory<CertificateFactory> */
    use HasFactory;

    /**
     * Keep the parent's updated_at (the mobile sync/409 token) current on
     * direct child writes. ResumeDocument::save bulk-inserts and touches the
     * resume itself, so this adds no extra write there.
     *
     * @var list<string>
     */
    protected $touches = ['resume'];

    protected $fillable = [
        'position',
        'name',
        'issuer',
        'obtained_at',
        'expires_at',
        'credential_id',
    ];

    /**
     * @return BelongsTo<Resume, $this>
     */
    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
