# Manual Password Reset Runbook (AUTH-01 stopgap)

> Status: **there is no self-service "forgot password" flow today.** No
> endpoint, no page, no email delivery infrastructure exists (see AUTH-01 in
> the readiness audit). This document is the interim process until that's
> built — see `18-production-readiness-roadmap.md` Phase B for the real flow
> (email OTP, reset tokens, forgot/reset pages).
>
> Until then: **a locked-out user's only path back in is you, running this
> script.** Set expectations with pilot merchants accordingly — "email
> support@lecrion untuk reset password" is a real support cost right now, not
> a formality.

## When to use this

- A merchant (owner/manager/cashier) forgot their password and asked for help.
- A staff account needs its password rotated after an employee leaves.
- You suspect an account's password is compromised (pair this with rotating
  `JWT_SECRET` too — see below, a password reset alone doesn't invalidate
  their existing session).

## How to reset a password

From the repo root:

```bash
npm run db:reset-password -- <email> <new-password>
```

or directly:

```bash
npx tsx scripts/reset-password.ts <email> <new-password>
```

This:
1. Looks up the user by email — fails loudly if no such user exists (nothing
   is changed).
2. Requires the new password to be at least 8 characters.
3. Hashes it with the same `bcrypt` cost factor (10) the app uses everywhere
   else, and writes it directly to `users.password_hash`.
4. Prints the affected user's id/role/store so you can confirm you reset the
   right account — never the password itself.

The user can log in immediately with the new password.

## What this does NOT do

- **Does not invalidate existing sessions.** If you're resetting because an
  account was compromised (not just forgotten), a new password alone doesn't
  kick out whoever already has a valid access/refresh token issued under the
  old one — there's no per-user session revocation mechanism yet (see SEC-01
  in the audit). To force everyone out immediately, rotate `JWT_SECRET` /
  `JWT_REFRESH_SECRET` in `.env` and restart the API — but that logs out
  *every* user on *every* store, not just this one. Only do that for a real
  compromise, not a routine "I forgot my password."
- **Does not verify the requester's identity.** This script trusts whoever is
  running it (you). There is no in-app "prove you own this email" step —
  that's exactly what the real email-OTP flow (Phase B) is for. Until then,
  verify identity out of band (phone call, WhatsApp to a known number, etc.)
  before resetting anything a merchant asks for.
- **Does not send any notification.** The user finds out their password
  changed only when you tell them. No "your password was changed" email
  exists either (same missing email infrastructure).

## Before you consider this "solved"

This is explicitly a stopgap for a 2-pilot-customer scale, not a substitute
for real self-service auth. Once there's any meaningful number of merchants,
the manual-reset-via-founder model doesn't scale and becomes a support
bottleneck. Build Phase B (`18-production-readiness-roadmap.md`) before then:
email verification, forgot-password request + reset-token flow, and the
corresponding frontend pages.
