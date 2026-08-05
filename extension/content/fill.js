/**
 * Resumegen Apply — inject on demand to fill empty fields or insert at focus.
 * Empty-only for bulk fill. Never submits forms.
 * Depends on fill-heuristics.js (ResumegenHeuristics).
 */
(function () {
    if (window.__resumegenApplyFillLoaded) {
        return;
    }
    window.__resumegenApplyFillLoaded = true;

    const H = window.ResumegenHeuristics;
    if (!H) {
        console.error('[Resumegen Apply] fill-heuristics.js missing');
        return;
    }

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === 'PING') {
            sendResponse({ ok: true });
            return;
        }
        if (message.type === 'FILL_COMMON') {
            try {
                sendResponse(fillCommon(message.profile || {}));
            } catch (err) {
                sendResponse({
                    filled: 0,
                    skipped: 0,
                    unmatched: 0,
                    filledKeys: [],
                    message: 'Fill failed on this page.',
                    error: String(err?.message || err),
                });
            }
            return;
        }
        if (message.type === 'INSERT_FOCUSED') {
            sendResponse(insertFocused(message.text || '', message.label || 'value'));
            return;
        }
    });

    function fillCommon(profile) {
        const values = H.valuesFromProfile(profile);
        const keys = H.KEY_ORDER.filter((k) => values[k]);

        const fieldEls = collectFieldsDeep(document);
        const scored = fieldEls.map((el, index) => ({
            el,
            index,
            signals: H.buildSignals(extractRaw(el)),
        }));

        const matches = H.matchFields(scored, keys);

        let filled = 0;
        let skipped = 0;
        let unmatched = 0;
        const filledKeys = [];

        for (const key of keys) {
            const match = matches[key];
            if (!match) {
                unmatched += 1;
                continue;
            }
            const el = fieldEls[match.index];
            if (!isEmptyField(el)) {
                skipped += 1;
                continue;
            }
            if (setFieldValue(el, values[key])) {
                filled += 1;
                filledKeys.push(key);
            } else {
                unmatched += 1;
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

    /**
     * Walk document + open shadow roots + same-origin iframes.
     * @param {Document|ShadowRoot} root
     * @param {number} depth
     * @returns {HTMLElement[]}
     */
    function collectFieldsDeep(root, depth = 0) {
        const out = [];
        if (!root || depth > 6) {
            return out;
        }

        const nodes = root.querySelectorAll
            ? root.querySelectorAll('input, textarea, select, [contenteditable="true"]')
            : [];

        for (const el of nodes) {
            if (!(el instanceof HTMLElement)) {
                continue;
            }
            if (!isFillableControl(el) || !isVisible(el)) {
                continue;
            }
            out.push(el);
        }

        // Open shadow roots
        const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
        for (const host of all) {
            if (host.shadowRoot) {
                out.push(...collectFieldsDeep(host.shadowRoot, depth + 1));
            }
        }

        // Same-origin iframes (some ATS embed the form)
        if (root instanceof Document) {
            for (const frame of root.querySelectorAll('iframe')) {
                try {
                    const doc = frame.contentDocument;
                    if (doc) {
                        out.push(...collectFieldsDeep(doc, depth + 1));
                    }
                } catch {
                    // cross-origin — ignore
                }
            }
        }

        return out;
    }

    function isFillableControl(el) {
        if (el.isContentEditable) {
            return true;
        }
        if (el instanceof HTMLSelectElement) {
            return !el.disabled;
        }
        if (el instanceof HTMLTextAreaElement) {
            return !el.disabled && !el.readOnly;
        }
        if (el instanceof HTMLInputElement) {
            const type = (el.type || 'text').toLowerCase();
            if (['hidden', 'submit', 'button', 'checkbox', 'radio', 'file', 'password', 'image', 'reset', 'color', 'range', 'date', 'datetime-local', 'month', 'week', 'time'].includes(type)) {
                return false;
            }
            return !el.disabled && !el.readOnly;
        }
        return false;
    }

    function extractRaw(el) {
        const labelledByIds = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
        const labelledByText = labelledByIds
            .map((id) => {
                try {
                    return document.getElementById(id)?.textContent || '';
                } catch {
                    return '';
                }
            })
            .join(' ');

        return {
            name: el.getAttribute('name') || el.name || '',
            id: el.id || '',
            placeholder: el.getAttribute('placeholder') || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            labelledBy: labelledByText,
            label: labelTextFor(el),
            autocomplete: el.getAttribute('autocomplete') || '',
            dataAutomationId: el.getAttribute('data-automation-id') || el.getAttribute('data-automationid') || '',
            dataTestId: el.getAttribute('data-testid') || el.getAttribute('data-test-id') || '',
            type: el instanceof HTMLInputElement ? (el.type || 'text') : '',
            tag: el.tagName.toLowerCase(),
        };
    }

    function labelTextFor(el) {
        const chunks = [];

        if (el.id) {
            try {
                const byFor = document.querySelector(`label[for="${cssEscape(el.id)}"]`);
                if (byFor) {
                    chunks.push(byFor.textContent || '');
                }
            } catch {
                // ignore
            }
        }

        const parentLabel = el.closest('label');
        if (parentLabel) {
            chunks.push(parentLabel.textContent || '');
        }

        // Greenhouse / custom: label often in previous sibling or parent grid cell
        const parent = el.parentElement;
        if (parent) {
            const prev = el.previousElementSibling;
            if (prev && isLabelish(prev)) {
                chunks.push(prev.textContent || '');
            }
            const parentPrev = parent.previousElementSibling;
            if (parentPrev && isLabelish(parentPrev)) {
                chunks.push(parentPrev.textContent || '');
            }
            // Walk up for role=group with labelled children
            const group = el.closest('[role="group"], fieldset, .field, .form-group, .application-field, .form-field');
            if (group) {
                const legend = group.querySelector('legend, .label, .field-label, label, [class*="label"]');
                if (legend && legend !== el && !legend.contains(el)) {
                    chunks.push(legend.textContent || '');
                }
            }
        }

        return chunks.join(' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    }

    function isLabelish(el) {
        if (!(el instanceof HTMLElement)) {
            return false;
        }
        const tag = el.tagName.toLowerCase();
        if (['label', 'span', 'div', 'p', 'legend', 'h1', 'h2', 'h3', 'h4'].includes(tag)) {
            const text = (el.textContent || '').trim();
            return text.length > 0 && text.length < 100 && !el.querySelector('input, textarea, select');
        }
        return false;
    }

    function cssEscape(value) {
        if (window.CSS && typeof CSS.escape === 'function') {
            return CSS.escape(value);
        }
        return String(value).replace(/"/g, '\\"');
    }

    function isEmptyField(el) {
        if (el.isContentEditable) {
            return !(el.textContent || '').trim();
        }
        if (el instanceof HTMLSelectElement) {
            const v = el.value;
            const text = el.options[el.selectedIndex]?.text || '';
            return !v || v === '' || /^select|choose|please|--|—/i.test(text.trim());
        }
        return !String(el.value || '').trim();
    }

    function isEditable(el) {
        return isFillableControl(el);
    }

    function isVisible(el) {
        if (!(el instanceof HTMLElement)) {
            return false;
        }
        if (el.closest('[hidden], [aria-hidden="true"]')) {
            // Some ATS mark inactive steps aria-hidden — skip those.
            const hiddenRoot = el.closest('[aria-hidden="true"]');
            if (hiddenRoot && hiddenRoot !== el) {
                return false;
            }
        }
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return false;
        }
        // opacity 0 sometimes used for offscreen traps; still skip if no box
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 && rect.height < 2) {
            return false;
        }
        return true;
    }

    function setFieldValue(el, value, { overwrite = false } = {}) {
        if (el instanceof HTMLSelectElement) {
            return setSelectValue(el, value);
        }

        if (el.isContentEditable) {
            if (!overwrite && (el.textContent || '').trim()) {
                return false;
            }
            el.focus();
            el.textContent = value;
            fireInputEvents(el, value);
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

        // React 16+ tracks value via the tracker; update if present.
        try {
            const tracker = el._valueTracker;
            if (tracker && typeof tracker.setValue === 'function') {
                tracker.setValue('');
            }
        } catch {
            // ignore
        }

        fireInputEvents(el, value);
        return true;
    }

    function fireInputEvents(el, value) {
        try {
            el.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: value,
            }));
        } catch {
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    function setSelectValue(el, value) {
        const target = value.toLowerCase().trim();
        let best = null;
        let bestScore = 0;

        for (const opt of el.options) {
            const t = (opt.text || '').trim().toLowerCase();
            const v = (opt.value || '').trim().toLowerCase();
            if (!t && !v) {
                continue;
            }
            let s = 0;
            if (t === target || v === target) {
                s = 100;
            } else if (t.startsWith(target) || target.startsWith(t)) {
                s = 80;
            } else if (t.includes(target) || target.includes(t)) {
                s = 50;
            }
            if (s > bestScore) {
                bestScore = s;
                best = opt;
            }
        }

        if (!best || bestScore < 50) {
            return false;
        }

        el.value = best.value;
        fireInputEvents(el, best.value);
        return true;
    }
})();
