<?php

namespace App\Http\Requests;

use App\Concerns\AbortsAsNotFound;
use App\Models\ResumeGroup;
use Illuminate\Foundation\Http\FormRequest;

class UpdateResumeGroupRequest extends FormRequest
{
    use AbortsAsNotFound;

    /**
     * Was previously left to ResumeGroupController::update()'s own
     * abort_unless — correct today, but a backstop for the next controller
     * that forgets it, same as UpdateResumeSharingRequest.
     */
    public function authorize(): bool
    {
        $resumeGroup = $this->route('resumeGroup');

        return $resumeGroup instanceof ResumeGroup
            && $resumeGroup->user_id === $this->user()?->id;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
        ];
    }
}
