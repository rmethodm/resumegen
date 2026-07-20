<?php

return [
    /*
     * Price of one job pairing, in cents.
     *
     * DELIBERATELY 0. This is instrumentation, not billing: pairings are recorded so
     * the questions in docs/prepaid-pricing-model.md §12 can be answered with real
     * data (median jobs tailored, % exceeding the grant, p90), while every user pays
     * nothing and sees nothing. Turning pricing on is a config change, not a migration.
     *
     * Do not set this above 0 without the explicit go-ahead CLAUDE.md requires for a
     * paywall — §12's stop rule says numbers 1-3 must exist first.
     */
    'job_cents' => (int) env('PRICING_JOB_CENTS', 0),

    /*
     * One-time grant on signup, in cents. At the proposed $5 this covers the
     * __general__ pairing plus nine jobs. 0 while prices are 0 — granting a balance
     * nobody spends would only add noise to the ledger.
     */
    'signup_grant_cents' => (int) env('PRICING_SIGNUP_GRANT_CENTS', 0),
];
