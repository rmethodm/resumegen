What's already strong

Auto-save on blur + sendBeacon on tab close, live strength score, completion bar, drag-to-reorder sections, 5 skill layouts with visual pickers, skill autocomplete that grows
its own dictionary, AI summary/bullet/keyword tools with a quota, 9 templates, font controls. This is a genuinely capable editor — more so than most free competitors. The
problem isn't capability; it's that the editor barely sells the upgrade.

The core conversion problem

Right now the only paywall the user ever sees inside the editor is the 🔒 DOCX button (line 734). Everything else either works silently or just disables when they hit a
limit. The biggest example:

When AI quota hits 0, the buttons just go gray (disabled) with no upgrade path. Lines 825/849/900 disable on ai.remaining === 0 and dead-end. That's the single most expensive
miss — the user is most motivated to pay at the exact moment they run out, and you show them a dead button instead of a "Get more →" link.

Tellingly, you already pass an aiCanUpgrade prop from the backend that the component never destructures or uses (declared in the type at line 437, absent from the destructure
at line 423). The upgrade nudge was clearly planned and never wired. That's your #1 fix.

Conversion levers, ranked

  <!-- 1. Turn the AI quota wall into an upgrade CTA. When ai.remaining === 0, swap the disabled button for "✨ Out of AI credits — Upgrade for more →" calling the -->

triggerUpgradeModal you already have. Also make the "X AI uses left this month" line (806) clickable when low. Highest impact, smallest change, and the backend prop already
exists.

  <!-- 2. Gate the premium templates visibly instead of hiding them. allowedTemplates filters the dropdown (667), so free users never see what they're missing. Show all 9 with a 🔒 -->

on locked ones — desire requires visibility. A locked-but-visible template is a far stronger pull than an absent one. 3. Watermark the free PDF / show a "Remove watermark — upgrade" strip on the preview. The preview panel (1119) and PDF download are unrestricted. A subtle watermark on free
exports is the most common resume-SaaS conversion driver and you have none. 4. Make the strength score sell the fix. The score (628) and completion bar (636) show a number but the editor doesn't tell free users how to raise it beyond basics. "3 weak
bullets — let AI rewrite them" turns the score into a reason to spend AI credits, which feeds lever #1. 5. ATS keyword gaps tied to a target job. handleKeywordGaps (578) finds gaps generically. Pasting a job description and tailoring against it is the headline feature of every
paid competitor (and your backlog already lists "AI tailoring"). This is the strongest new paid feature, but it's bigger than the others.

Usability gaps (cheap wins, weak conversion impact)

- "Improve with AI" rewrites the whole bullet block with no undo (570) — one bad rewrite loses their text. A single "↶ Undo" that restores the pre-rewrite value would prevent
  the worst AI frustration.
- Profile photo only appears for the executive template (691) — fine, but there's no hint to other-template users that switching unlocks it.
- Font Sizes section sits at the very top of the form (749), above even the resume name — odd priority for something most users never touch. It belongs in the sidebar with
  the other appearance controls.
- No mobile story — the split-panel + fixed 50% preview (1120) assumes desktop. Worth knowing, not worth fixing now.

---

My recommendation: do #1 first — it's the highest-ROI change in the whole app, the backend already feeds the prop, and it's maybe 15 lines. Then #2 (visible locked templates)
and #3 (watermark) as a "monetize the editor" batch.
