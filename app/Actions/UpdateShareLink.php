<?php

namespace App\Actions;

use App\Models\ResumeShareLink;

/**
 * Apply validated UpdateResumeShareLinkRequest data to a share link,
 * refusing the two password states that would lock every visitor out.
 * The web share modal and the mobile API both call this so the guards
 * cannot drift; each caller renders the refusal in its own format.
 */
class UpdateShareLink
{
    /**
     * @param  array<string, mixed>  $data  Validated UpdateResumeShareLinkRequest data.
     * @return string|null The refusal message for the `password` field, or null when saved.
     */
    public function handle(ResumeShareLink $link, array $data): ?string
    {
        // Passwords are hashed, so the server can never show one — the modal
        // generates client-side and sends the plaintext along when enabling.
        // Enabling with nothing stored and nothing sent would silently lock
        // every visitor out behind a password nobody knows.
        if (($data['require_password'] ?? false)
            && blank($data['password'] ?? null)
            && $link->password === null) {
            return 'Provide a password to enable protection.';
        }

        // Clearing the stored password while the gate stays on would leave a
        // link nothing can unlock — the hash is gone, so no password matches.
        if (array_key_exists('password', $data)
            && $data['password'] === null
            && ($data['require_password'] ?? $link->require_password)) {
            return 'Disable password protection instead of clearing the password.';
        }

        $link->update($data);

        return null;
    }
}
