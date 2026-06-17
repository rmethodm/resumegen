 <!-- I think I talked about this or asked you about this a few days ago, but I need a super admin section that allows me to manage the entire application. I'm talking about everything. Users resumes, AI usage reporting than anything else you can think of. Give me a list of things that can be done for this. -->

Show processing indicator when click links that use AI.

Everything in code is built. No code to write — what's left is pure Stripe Dashboard + .env config. Here's the actual checklist:

1. Create 6 prices in Stripe (Products → 3 products, each with monthly + yearly recurring prices). Copy each price\_… ID.

2. Replace the dead env vars. These two are no longer read by anything — delete them:
   STRIPE*MONTHLY_PRICE_ID ← dead
   STRIPE_YEARLY_PRICE_ID ← dead
   Add the six the config actually reads:
   STRIPE_STARTER_MONTHLY_PRICE_ID=price*…
   STRIPE*STARTER_YEARLY_PRICE_ID=price*…
   STRIPE*PRO_MONTHLY_PRICE_ID=price*…
   STRIPE*PRO_YEARLY_PRICE_ID=price*…
   STRIPE*AGENCY_MONTHLY_PRICE_ID=price*…
   STRIPE*AGENCY_YEARLY_PRICE_ID=price*…
   Then php artisan config:clear (config caching will otherwise hold the nulls).

3. Webhook — route already exists at POST /stripe/webhook.

- Local testing: stripe listen --forward-to localhost/stripe/webhook → it prints a whsec\_…; that's your local STRIPE_WEBHOOK_SECRET (different from the Dashboard one — common
  gotcha).
- Production: Dashboard → Webhooks → add endpoint https://yourdomain/stripe/webhook, subscribe to customer.subscription._ + invoice._ events, copy that signing secret into
  prod env.

4. Verify it maps prices → tiers. Your Subscription observer syncs plan_tier/is_agency — let me confirm it keys off these exact price IDs, since it was reading nulls until
   now:

Searched for 1 pattern, read 1 file (ctrl+o to expand)

⏺ Confirmed — the whole chain works once you set the env vars. The observer maps stripe_price → tier via UserLimits::tierFromPriceId(), which reads those six config IDs. Right
now they're all null, so any real subscription would silently map to the default (free) tier — that's exactly the bug Step 2 fixes.

So the bottom line:

→ No code needed. Set the 6 STRIPE\_\*\_PRICE_ID env vars, delete the 2 dead ones, config:clear, wire the webhook secret. → skipped: nothing — the integration's already built;
this was a config gap, not a code gap.

Quick smoke test after you set them, to prove the mapping resolves before you touch a real card:
php artisan tinker --execute 'dump(App\Services\UserLimits::tierFromPriceId(config("services.stripe.pro_monthly_price_id")));'
Should print "pro". If it prints "free", the env var didn't load (config cache or typo).
