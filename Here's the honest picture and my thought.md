Here's the honest picture and my thoughts:

  What it actually is: 100% rule-based. Pure PHP — counts sections, checks for a number in a bullet, checks LinkedIn exists. Zero AI, zero ATS system involvement. It runs
  synchronously on every save.

  Why it's confusing: The label "ATS Score" implies either (a) a real ATS system parsed your resume, or (b) AI analyzed it. Neither is true. Users completing the checklist will
  naturally assume an AI or ATS engine is validating their resume against employer systems — which sets a false expectation and could erode trust when they don't get
  interviews.

  ---
  Three options, in order of effort:

  1. Rename it (5 min, lowest risk)
  Call it "Resume Checklist" or "Completeness Score." Add a subtitle like "Based on resume best practices." Keep it exactly where it is. This is honest, still useful, and kills
  the confusion with no UX disruption. The actual ATS feature is the keyword gap tool that compares against a job description — that one is legitimately AI-powered and worth
  labeling as such.

  2. Move it to a "Score" tab or modal (medium effort)
  Keep the builder clean, surface the checklist as a dedicated tab or a "How complete is my resume?" modal. Good if you want to visually separate "editing" from "analysis."
  Downside: it loses the live inline feedback loop that makes it useful.

  3. Make it actually AI (most work, most honest)
  Replace the rule-based scorer with a real AI call that evaluates the resume and returns feedback. Gate it behind a paid tier. This is the most honest version of "ATS Score" —
  but it costs tokens per save/refresh and needs rate limiting.

  ---
  My call: Option 1 is the right move. The feature is genuinely useful as a completeness nudge — it just has a misleading name. Rename it "Resume Checklist," drop "ATS" from
  the label, and let the keyword gap tool (which is AI + job-description-aware) own the "ATS" branding. Two-line change, no UX disruption.

  Want me to do the rename, or go with one of the other approaches?