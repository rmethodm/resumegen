/**
 * Resumegen Apply — inject on demand to fill empty fields or insert at focus.
 * Empty-only for bulk fill. Never submits forms.
 */
(function () {
    if (window.__resumegenApplyFillLoaded) {
        return;
    }
    window.__resumegenApplyFillLoaded = true;

    const KEY_ORDER = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'linkedin',
        'website',
        'location',
        'summary',
        'current_title',
        'current_company',
        'target_role',
        'skills',
        'full_name',
    ];

    const KEY_PATTERNS = {
        first_name: [/\bfirst\s*name\b/, /\bgiven\s*name\b/, /\bfname\b/, /\bname\s*first\b/],
        last_name: [/\blast\s*name\b/, /\bfamily\s*name\b/, /\bsurname\b/, /\blname\b/, /\bname\s*last\b/],
        full_name: [/\bfull\s*name\b/, /\byour\s*name\b/, /\blegal\s*name\b/, /\bapplicant\s*name\b/, /\bname\b/],
        email: [/\be-?mail\b/, /\bemail\s*address\b/],
        phone: [/\bphone\b/, /\bmobile\b/, /\btel\b/, /\bcell\b/],
        location: [/\bcity\b/, /\blocation\b/, /\baddress\s*city\b/, /\bcurrent\s*city\b/],
        linkedin: [/\blinkedin\b/, /\bli\s*url\b/],
        website: [/\bwebsite\b/, /\bportfolio\b/, /\bpersonal\s*site\b/, /\bhomepage\b/],
        summary: [/\bsummary\b/, /\babout\s*(you|me|yourself)?\b/, /\bcover\s*letter\b/, /\bpersonal\s*statement\b/, /\bbio\b/],
        target_role: [/\bdesired\s*(job|role|position|title)\b/, /\btarget\s*role\b/],
        current_title: [/\bcurrent\s*(job\s*)?(title|role|position)\b/, /\bjob\s*title\b/],
        current_company: [/\bcurrent\s*(company|employer)\b/, /\bcompany\s*name\b/, /\bemployer\b/],
        skills: [/\bskills\b/, /\bkeywords\b/],
    };

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === 'PING') {
            sendResponse({ ok: true });
            return;
        }
        if (message.type === 'FILL_COMMON') {
            sendResponse(fillCommon(message.profile || {}));
            return;
        }
        if (message.type === 'INSERT_FOCUSED') {
            sendResponse(insertFocused(message.text || '', message.label || 'value'));
            return;
        }
    });

    function fillCommon(profile) {
        const contact = profile.contact || {};
        const raw = {
            first_name: contact.first_name || '',
            last_name: contact.last_name || '',
            full_name: contact.full_name || '',
            email: contact.email || '',
            phone: contact.phone || '',
            location: contact.location || '',
            linkedin: contact.linkedin || '',
            website: contact.website || '',
            summary: profile.summary || '',
            target_role: profile.target_role || '',
            current_title: profile.latest_role?.title || profile.target_role || '',
            current_company: profile.latest_role?.company || '',
            skills: profile.skills_csv || '',
        };

        const values = {};
        for (const key of KEY_ORDER) {
            if (raw[key]) {
                values[key] = raw[key];
            }
        }

        const fields = collectFields(document);
        let filled = 0;
        let skipped = 0;
        let unmatched = 0;
        const filledKeys = [];
        const used = new Set();

        for (const [key, value] of Object.entries(values)) {
            const candidates = fields.filter((f) => !used.has(f) && matchesKey(f, key));
            if (candidates.length === 0) {
                unmatched += 1;
                continue;
            }

            const field = candidates[0];
            if (!isEmptyField(field.el)) {
                skipped += 1;
                used.add(field);
                continue;
            }

            if (setFieldValue(field.el, value)) {
                filled += 1;
                filledKeys.push(key);
                used.add(field);
            }
        }

        return {
            filled,
            skipped,
            unmatched,
            filledKeys,
            message: formatFillMessage(filled, skipped, unmatched),
        };
    }

    function formatFillMessage(filled, skipped, unmatched) {
        if (filled === 0 && skipped === 0) {
            return 'No fillable fields found on this page';
        }
        const parts = [`Filled ${filled} field${filled === 1 ? '' : 's'}`];
        if (skipped > 0) {
            parts.push(`Skipped ${skipped} (already had values)`);
        }
        if (unmatched > 0) {
            parts.push(`Couldn't match ${unmatched}`);
        }
        return parts.join(' · ');
    }

    function insertFocused(text, label) {
        if (!text) {
            return {
                ok: false,
                reason: 'empty_value',
                message: `No ${label} on this resume. Add it in Resumegen.`,
            };
        }

        const el = document.activeElement;
        if (!el || !isEditable(el)) {
            return {
                ok: false,
                reason: 'no_focus',
                message: 'Click a text field on the page first, then insert.',
            };
        }

        setFieldValue(el, text, { overwrite: true });
        return {
            ok: true,
            message: `Inserted ${label} into the focused field.`,
        };
    }

    function collectFields(root) {
        const nodes = root.querySelectorAll('input, textarea, select');
        const out = [];

        for (const el of nodes) {
            if (!isVisible(el) || el.disabled || el.readOnly) {
                continue;
            }
            if (el instanceof HTMLInputElement) {
                const type = (el.type || 'text').toLowerCase();
                if (['hidden', 'submit', 'button', 'checkbox', 'radio', 'file', 'password', 'image', 'reset', 'color', 'range'].includes(type)) {
                    continue;
                }
            }
            out.push({ el, meta: fieldMeta(el) });
        }

        return out;
    }

    function fieldMeta(el) {
        const bits = [
            el.name,
            el.id,
            el.placeholder,
            el.getAttribute('aria-label'),
            el.getAttribute('autocomplete'),
            el.getAttribute('data-testid'),
            labelTextFor(el),
        ];
        return bits
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .replace(/[_\-./]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function labelTextFor(el) {
        if (el.id) {
            const byFor = document.querySelector(`label[for="${cssEscape(el.id)}"]`);
            if (byFor) {
                return byFor.textContent || '';
            }
        }
        const parentLabel = el.closest('label');
        return parentLabel ? parentLabel.textContent || '' : '';
    }

    function cssEscape(value) {
        if (window.CSS && typeof CSS.escape === 'function') {
            return CSS.escape(value);
        }
        return String(value).replace(/"/g, '\\"');
    }

    function matchesKey(field, key) {
        const patterns = KEY_PATTERNS[key];
        if (!patterns) {
            return false;
        }
        const meta = field.meta;
        if (!meta) {
            return false;
        }

        if (key === 'full_name') {
            if (KEY_PATTERNS.first_name.some((p) => p.test(meta)) || KEY_PATTERNS.last_name.some((p) => p.test(meta))) {
                return false;
            }
        }

        return patterns.some((p) => p.test(meta));
    }

    function isEmptyField(el) {
        if (el instanceof HTMLSelectElement) {
            const v = el.value;
            return !v || v === '' || /^select|choose|please/i.test(el.options[el.selectedIndex]?.text || '');
        }
        return !String(el.value || '').trim();
    }

    function isEditable(el) {
        if (!(el instanceof HTMLElement)) {
            return false;
        }
        if (el.isContentEditable) {
            return true;
        }
        if (el instanceof HTMLTextAreaElement) {
            return !el.disabled && !el.readOnly;
        }
        if (el instanceof HTMLInputElement) {
            const type = (el.type || 'text').toLowerCase();
            return !['hidden', 'submit', 'button', 'checkbox', 'radio', 'file', 'password'].includes(type)
                && !el.disabled
                && !el.readOnly;
        }
        return false;
    }

    function isVisible(el) {
        if (!(el instanceof HTMLElement)) {
            return false;
        }
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function setFieldValue(el, value, { overwrite = false } = {}) {
        if (el instanceof HTMLSelectElement) {
            return setSelectValue(el, value);
        }

        if (el.isContentEditable) {
            if (!overwrite && el.textContent?.trim()) {
                return false;
            }
            el.focus();
            el.textContent = value;
            el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }

        if (!overwrite && !isEmptyField(el)) {
            return false;
        }

        el.focus();
        const proto = el instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
        if (descriptor?.set) {
            descriptor.set.call(el, value);
        } else {
            el.value = value;
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        return true;
    }

    function setSelectValue(el, value) {
        const target = value.toLowerCase();
        for (const opt of el.options) {
            const t = (opt.text || '').trim().toLowerCase();
            const v = (opt.value || '').trim().toLowerCase();
            if (t === target || v === target || t.includes(target) || (t && target.includes(t))) {
                el.value = opt.value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
        }
        return false;
    }
})();
