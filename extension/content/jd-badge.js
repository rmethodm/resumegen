/**
 * Resumegen Apply — inline JD-match badge (Phase D). Injected on demand,
 * same pattern as content/fill.js. Depends on shared/jd-keyword-overlap.js
 * (ResumegenJdOverlap global). Deterministic, client-side only — no AI,
 * no network round trip.
 */
(function () {
    if (window.__resumegenApplyJdBadgeLoaded) {
        return;
    }
    window.__resumegenApplyJdBadgeLoaded = true;

    const JD = window.ResumegenJdOverlap;
    if (!JD) {
        console.error('[Resumegen Apply] jd-keyword-overlap.js missing');
        return;
    }

    let badgeHost = null;

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === 'PING') {
            sendResponse({ ok: true });
            return;
        }
        if (message.type === 'DETECT_JD_BADGE') {
            sendResponse(showBadge(message.profile || {}));
            return;
        }
        if (message.type === 'REMOVE_JD_BADGE') {
            removeBadge();
            sendResponse({ ok: true });
            return;
        }
    });

    function findJdBlock() {
        const preferred = document.querySelector(
            'article, [class*="description" i], [class*="posting" i], [class*="job-details" i]'
        );
        if (preferred && (preferred.textContent || '').trim().length > 200) {
            return preferred;
        }

        // Fallback: the largest visible text block on the page.
        let best = null;
        let bestLength = 0;
        const candidates = document.querySelectorAll('div, section, article, main');
        for (const el of candidates) {
            if (el.children.length > 20) {
                continue;
            }
            const text = (el.textContent || '').trim();
            if (text.length > bestLength && text.length > 200) {
                best = el;
                bestLength = text.length;
            }
        }
        return best;
    }

    function showBadge(profile) {
        const block = findJdBlock();
        if (!block) {
            removeBadge();
            return { ok: false, reason: 'no_jd_found', message: 'No job description found on this page.' };
        }

        const text = (block.textContent || '').trim();
        const result = JD.jdKeywordOverlap(profile, text);

        renderBadge(result.score, result.total);

        return { ok: true, score: result.score, total: result.total };
    }

    function renderBadge(score, total) {
        if (!badgeHost) {
            badgeHost = document.createElement('div');
            badgeHost.id = 'resumegen-jd-badge-host';
            badgeHost.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647;';
            document.documentElement.appendChild(badgeHost);
        }

        const root = badgeHost.shadowRoot || badgeHost.attachShadow({ mode: 'open' });
        const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626';

        root.innerHTML = `
            <style>
                .badge {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
                    font-size: 13px;
                    font-weight: 600;
                    color: #fff;
                    background: ${color};
                    border-radius: 999px;
                    padding: 8px 14px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                }
            </style>
            <div class="badge">${total === 0 ? 'No JD set' : `${score}% match`}</div>
        `;
    }

    function removeBadge() {
        if (badgeHost) {
            badgeHost.remove();
            badgeHost = null;
        }
    }
})();
