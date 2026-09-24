<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Mobile API resume create. Token ability and disabled-account checks stay
 * in Api\ResumeController (GuardsMobileTokens); there is no record to own yet.
 */
class StoreMobileResumeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            // Idempotency key for offline retries.
            'client_uuid' => ['nullable', 'uuid'],
        ];
    }
}
