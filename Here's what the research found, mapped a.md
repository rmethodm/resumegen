Here's what the research found, mapped against what you've actually built:

  ---
  What the Market Says Is MVF (Minimum Viable Feature Set)

  The research confirmed 4 things every competitive resume builder needs:

  1. PDF download — you have it
  2. ATS keyword analysis tied to a pasted JD — you have it
  3. At least one AI writing feature (rewrite or draft) — you have multiple
  4. Real-time quality score — you have the Strength Scorer

  You already have the full MVF. Everything beyond that is optional complexity.

  ---
  Where Resumegen Is Over-Built vs. the Market

  1. Job Applications Tracker

  No competitor in the study offers this (Teal does, but it's their entire product). You have it as a secondary feature in a resume builder. It adds DB tables, UI, and limit
  logic for something users will likely track in a spreadsheet or a dedicated job tracker. Cut it or spin it out later.

  2. Four Pricing Tiers

  Free → Starter → Pro → Agency is four tiers for a product still finding its market. The market standard is 2-3. Your Agency tier (team workspace) adds multi-tenancy
  complexity for what is almost certainly zero revenue right now. Collapse to Free / Pro, add Agency only when someone actually asks for team seats.

  3. Team Workspace (Agency)

  Directly tied to the above. Multi-user team features require invitation flows, permission scoping, and billing complexity. Competitors don't offer this until much later.
  Delete the tier, delete the code.

  4. Referral Rewards System

  A Stripe-integrated, DB-transactional referral program with lockForUpdate + idempotency is serious infrastructure for a pre-launch app. Competitors don't ship this until
  they've validated retention. Remove it; add it back when you have 500+ paid users who want to refer.

  5. Interview Coach

  Dedicated apps (Yoodli, Interviewing.io, Big Interview) do this much better. You noted it yourself as a new feature in AiPrompts. Competitors offer interview question
  generation as a thin feature — not a full coach panel. Demote to a single "Generate interview questions" AI button, not a panel.

  6. Resume Snapshots / Variants

  Elegant feature, but heavy. No competitor offers this in their core product. Keep variants (tailored copies make sense for the JD workflow) but cut snapshots.

  ---
  What You Should Keep (It's Your Actual Edge)

  - ATS Match Panel + JD keyword gap — Rezi charges $29/mo for exactly this. You have it at Starter tier. This is your differentiator.
  - DOCX export gating — research confirms this is the #1 upgrade lever across all builders. Keep it gated.
  - Strength Scorer — Rezi's 23-criteria score is their headline feature. Your scorer is equivalent.
  - Template gating — research confirms this is the #2 upgrade lever.
  - AI quota gating — research confirms this is the #3 upgrade lever.

  ---
  The Trim Plan (in order of payoff)

  ┌───────────────────────────────────────┬─────────────────────────────────┬─────────────────────────────┐
  │                  Cut                  │       Complexity removed        │            Risk             │
  ├───────────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
  │ Job applications tracker              │ ~3 DB tables, UI, limits        │ Low — barely used           │
  ├───────────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
  │ Agency tier + team workspace          │ Multi-tenancy, invitation flows │ Low — likely $0 revenue     │
  ├───────────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
  │ Referral rewards                      │ Stripe integration, 3 DB models │ Low — pre-launch            │
  ├───────────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
  │ Resume snapshots                      │ Storage, restore logic          │ Medium — some users may use │
  ├───────────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
  │ Interview Coach panel → single button │ 1 controller, 1 panel component │ Low                         │
  ├───────────────────────────────────────┼─────────────────────────────────┼─────────────────────────────┤
  │ 4 tiers → 2 tiers                     │ UserLimits simplification       │ Medium — requires migration │
  └───────────────────────────────────────┴─────────────────────────────────┴─────────────────────────────┘

  Doing the top 3 alone would probably cut ~30% of the codebase surface without touching anything users actually pay for.