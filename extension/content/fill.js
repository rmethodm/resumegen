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

    let crossOriginFrameCount = 0;

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === 'PING') {
            sendResponse({ ok: true });
            return;
        }
        if (message.type === 'FILL_COMMON') {
            fillCommon(message.profile || {}, message.selectedKeys)
                .then(sendResponse)
                .catch((err) => sendResponse({
                    filled: 0,
                    skipped: 0,
                    unmatched: 0,
                    filledKeys: [],
                    message: 'Fill failed on this page.',
                    error: String(err?.message || err),
                }));
            return true;
        }
        if (message.type === 'SCAN_FIELDS') {
            scanFields(message.profile || {})
                .then(sendResponse)
                .catch((err) => sendResponse({
                    matches: [],
                    message: 'Scan failed on this page.',
                    error: String(err?.message || err),
                }));
            return true;
        }
        if (message.type === 'GET_FOCUS_CONTEXT') {
            sendResponse(getFocusContext(message.profile || {}));
            return;
        }
        if (message.type === 'INSERT_FOCUSED') {
            sendResponse(insertFocused(message.text || '', message.label || 'value'));
            return;
        }
    });

    async function scanFields(profile) {
        const values = H.valuesFromProfile(profile);
        const keys = H.KEY_ORDER.filter((k) => values[k]);
        crossOriginFrameCount = 0;
        const fieldEls = collectFieldsDeep(document);
        const scored = fieldEls.map((el, index) => ({
            el,
            index,
            signals: H.buildSignals(extractRaw(el)),
        }));
        const matches = H.matchFields(scored, keys);

        return {
            matches: keys.map((key) => {
                const match = matches[key];
                const field = match ? scored[match.index] : null;
                return {
                    key,
                    score: match?.score || 0,
                    matched: Boolean(match),
                    empty: Boolean(field && isEmptyField(field.el)),
                    fieldLabel: field ? field.signals.raw?.label || field.signals.raw?.name || field.signals.raw?.id || field.signals.raw?.placeholder || 'Recognized field' : '',
                };
            }),
            crossOriginFrames: crossOriginFrameCount,
            fieldCount: fieldEls.length,
        };
    }

    function getFocusContext(profile) {
        const el = document.activeElement;
        if (!el || !isEditable(el) || !isVisible(el)) {
            return {
                ok: false,
                reason: 'no_focus',
                message: 'Click a text field on the page first, then refresh suggestions.',
            };
        }

        const raw = extractRaw(el);
        const signals = H.buildSignals(raw);
        const values = H.valuesFromProfile(profile);
        const suggestions = H.KEY_ORDER
            .filter((key) => values[key])
            .map((key) => ({ key, score: H.scoreField(signals, key) }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);

        return {
            ok: true,
            fieldLabel: raw.label || raw.ariaLabel || raw.placeholder || raw.name || raw.id || 'Focused field',
            suggestions,
        };
    }

    async function fillCommon(profile, selectedKeys = null) {
        const values = H.valuesFromProfile(profile);
        const selected = Array.isArray(selectedKeys) ? new Set(selectedKeys) : null;
        const keys = H.KEY_ORDER.filter((k) => values[k] && (!selected || selected.has(k)));

        crossOriginFrameCount = 0;
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
                if (isComboboxTrigger(el)) {
                    await trySelectComboboxOption(el, values[key]);
                }
            } else {
                unmatched += 1;
            }
        }

        return {
            filled,
            skipped,
            unmatched,
            filledKeys,
            message: formatFillMessage(filled, skipped, unmatched, crossOriginFrameCount),
        };
    }

    function formatFillMessage(filled, skipped, unmatched, crossOriginFrames) {
        if (filled === 0 && skipped === 0) {
            if (crossOriginFrames > 0) {
                return "This application form is in an embedded frame we can't access (cross-origin) — try opening it directly at the source site.";
            }
            return 'No fillable fields found on this page';
        }
        const parts = [`Filled ${filled} field${filled === 1 ? '' : 's'}`];
        if (skipped > 0) {
            parts.push(`Skipped ${skipped} (already had values)`);
        }
        if (unmatched > 0) {
            parts.push(`Couldn't match ${unmatched}`);
        }
        if (crossOriginFrames > 0) {
            parts.push(`${crossOriginFrames} embedded frame${crossOriginFrames === 1 ? '' : 's'} couldn't be reached`);
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
                    } else if (isCrossOriginFrame(frame)) {
                        crossOriginFrameCount += 1;
                    }
                } catch {
                    // cross-origin — accessing contentDocument threw
                    crossOriginFrameCount += 1;
                }
            }
        }

        return out;
    }

    function isCrossOriginFrame(frame) {
        const src = frame.getAttribute('src') || '';
        if (!src || src.startsWith('about:') || src.startsWith('javascript:')) {
            return false;
        }
        try {
            return new URL(src, document.baseURI).origin !== window.location.origin;
        } catch {
            return false;
        }
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
        const options = Array.from(el.options).map((opt) => ({ text: opt.text, value: opt.value }));
        const match = H.bestOptionMatch(options, value);
        if (!match) {
            return false;
        }

        const best = el.options[match.index];
        el.value = best.value;
        fireInputEvents(el, best.value);
        return true;
    }

    /**
     * WAI-ARIA combobox pattern: a text input that drives a separate listbox
     * (Workday school/country typeahead, etc.). Typing alone fills the text
     * but leaves the widget's internal "selected option" state empty, which
     * some ATS forms reject on submit — so after typing, try to click the
     * best-matching rendered option.
     */
    function isComboboxTrigger(el) {
        if (!(el instanceof HTMLInputElement)) {
            return false;
        }
        const role = (el.getAttribute('role') || '').toLowerCase();
        const autocomplete = (el.getAttribute('aria-autocomplete') || '').toLowerCase();
        const hasPopup = (el.getAttribute('aria-haspopup') || '').toLowerCase();
        return role === 'combobox' || autocomplete === 'list' || autocomplete === 'both' || hasPopup === 'listbox';
    }

    function findListboxOptions(el) {
        const ownerId = el.getAttribute('aria-controls') || el.getAttribute('aria-owns') || '';
        let listbox = null;
        if (ownerId) {
            listbox = ownerId.split(/\s+/).map((id) => document.getElementById(id)).find(Boolean) || null;
        }
        if (!listbox) {
            listbox = el.closest('[role="group"], .field, .form-field')?.querySelector('[role="listbox"]')
                || document.querySelector('[role="listbox"]');
        }
        if (!listbox) {
            return [];
        }
        return Array.from(listbox.querySelectorAll('[role="option"]')).filter(isVisible);
    }

    function wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function trySelectComboboxOption(el, value) {
        const attempts = 6;
        for (let i = 0; i < attempts; i += 1) {
            const optionEls = findListboxOptions(el);
            if (optionEls.length) {
                const options = optionEls.map((node) => ({ text: node.textContent || '' }));
                const match = H.bestOptionMatch(options, value);
                if (match) {
                    const target = optionEls[match.index];
                    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
                        target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
                    }
                }
                return;
            }
            await wait(100);
        }
    }
})();
