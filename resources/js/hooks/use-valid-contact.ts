import { useMemo } from 'react';
import { emailError, phoneError } from '@/lib/contact-validation';
import type { ResumeDraft } from '@/types';

export type ContactErrors = {
    email: string | null;
    phone: string | null;
};

/**
 * Splits the draft into what the editor shows and what autosave sends.
 *
 * The resume saves as one payload, so a malformed email would 422 the whole
 * PUT and take every other edit in the same debounce window with it. Instead
 * an invalid field is sent as the value the server already holds: the payload
 * keeps its shape (no controller change), the stored value survives, and the
 * inputs keep showing what was actually typed.
 *
 * The cost is that the bad field silently stops saving, so the caller has to
 * surface `errors` somewhere the user will see it even from another section.
 *
 * `savedEmail` and `savedPhone` are passed as strings rather than as the whole
 * server prop on purpose — the page spreads that prop into a fresh object every
 * render, and an unstable dependency here would restart the autosave debounce
 * on each keystroke and never let it fire.
 */
export function useValidContact(
    draft: ResumeDraft,
    savedEmail: string,
    savedPhone: string,
): {
    payload: ResumeDraft;
    errors: ContactErrors;
} {
    const errors = useMemo<ContactErrors>(
        () => ({
            email: emailError(draft.email),
            phone: phoneError(draft.phone),
        }),
        [draft.email, draft.phone],
    );

    const payload = useMemo(() => {
        if (errors.email === null && errors.phone === null) {
            return draft;
        }

        return {
            ...draft,
            // A row written before these rules existed can hold a value the
            // server would now reject, which would block every save forever.
            // Fall back to empty, which the nullable rules accept.
            email:
                errors.email === null
                    ? draft.email
                    : emailError(savedEmail) === null
                      ? savedEmail
                      : '',
            phone:
                errors.phone === null
                    ? draft.phone
                    : phoneError(savedPhone) === null
                      ? savedPhone
                      : '',
        };
    }, [draft, errors, savedEmail, savedPhone]);

    return { payload, errors };
}
