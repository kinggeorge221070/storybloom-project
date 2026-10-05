# Supabase and Paystack setup

This repository is a static HTML/CSS/JavaScript prototype. The files below
prepare a Supabase schema and local configuration, but the website is not yet
connected to Supabase, and checkout does not process payments.

## Prerequisites

- A Supabase project
- The Supabase CLI
- A Paystack account (start with test keys)

## Initialize the Supabase project

1. Copy `.env.example` to `.env.local` and replace the Supabase URL and
   publishable/anon key. Do not put the Paystack secret key in browser code.
2. Link the CLI to your project and apply the database migration:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

3. Configure the Paystack secret for server-side Edge Functions:

   ```powershell
   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_PAYSTACK_TEST_SECRET
   ```

4. Set the deployed site's URL and allowed authentication redirect URLs in the
   Supabase dashboard before enabling sign-up on a public deployment.

## Schema overview

- `profiles` is keyed by the Supabase Auth user ID. A database trigger creates
  each profile; users can only read their own profile and update their name.
- `books` stores a user's book draft and status. Row Level Security restricts
  reads and writes to its owner.
- `orders` stores delivery details and a server-owned payment status. Users can
  read their own orders; browser clients cannot insert or update order/payment
  records. A trusted server function must create orders and verify Paystack
  transactions.
- `book-photos` is a private Storage bucket. Object paths must start with the
  authenticated user's UUID; only JPEG, PNG, and WebP files up to 10 MiB are
  allowed.

## Before launch

- Replace the current browser-only account and draft code in `index.js` with
  Supabase Auth, database, and Storage calls. The current local account
  prototype stores passwords in browser storage and is not safe for real users.
- Implement authenticated server-side payment initialization and a Paystack
  webhook that verifies signatures and transaction status before marking an
  order paid. Calculate prices on the server; never trust a client-submitted
  amount or a redirect to the confirmation page as proof of payment.
- Define and enforce the real product pricing, order/admin permissions, data
  retention, and privacy/terms policies.
- Use Paystack live credentials only as Supabase function secrets after the
  test payment and webhook flow is verified.

The Supabase URL and publishable/anon key may be used in a browser client once
RLS is enabled and verified. Never expose a Supabase service-role key or
Paystack secret key to the browser or commit them to the repository.
