/**
 * Format checks for the two contact fields that can be wrong rather than
 * merely unusual. Both fields are optional, so empty is always valid.
 *
 * These mirror the rules in UpdateResumeRequest. The server stays the
 * authority; this exists so one typo is caught before it 422s a PUT that
 * carries the rest of the document with it.
 */

/**
 * Deliberately not RFC 5322: one @, something either side, a dot in the
 * domain, no whitespace. Anything subtler is the server's `email` rule's job —
 * a stricter regex here would reject valid addresses the server accepts, which
 * is the one failure mode this must not have.
 */
const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The single shape a stored phone number is allowed to take. */
const phoneShape = /^\(\d{3}\) \d{3}-\d{4}$/;

export function emailError(value: string): string | null {
    const trimmed = value.trim();

    if (trimmed === '' || emailShape.test(trimmed)) {
        return null;
    }

    return 'Enter a valid email address.';
}

/**
 * US numbers only, stored in exactly one shape: (123) 456-7890.
 *
 * Because `formatPhone` runs on every keystroke the field can only hold a
 * partial version of that shape, never a wrong one — so the only failure this
 * reports is an incomplete number.
 */
export function phoneError(value: string): string | null {
    const trimmed = value.trim();

    if (trimmed === '' || phoneShape.test(trimmed)) {
        return null;
    }

    return 'Enter a 10-digit US phone number.';
}

/**
 * Punches whatever was typed into (123) 456-7890 as it is typed.
 *
 * Digits are the only input that counts, so pasting +1 (555) 123-4567 or
 * 555.123.4567 both land on the same stored value. A leading US country code
 * is dropped rather than rejected — it is the one piece of extra input that is
 * unambiguously correct rather than a typo.
 *
 * Formatting on each keystroke rather than on blur is what keeps `phoneError`
 * simple: the field is never in a state the validator has to reason about
 * beyond "how far through the shape is it".
 */
export function formatPhone(value: string): string {
    let digits = value.replace(/\D/g, '');

    if (digits.length === 11 && digits.startsWith('1')) {
        digits = digits.slice(1);
    }

    digits = digits.slice(0, 10);

    if (digits.length <= 3) {
        // No parens until there is an area code to close, or backspacing out
        // of "(12" would re-add the "(" the user just deleted.
        return digits;
    }

    if (digits.length <= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
