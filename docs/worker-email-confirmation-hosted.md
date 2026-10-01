# Worker email confirmation — hosted diagnosis and template steps

Apply Dashboard checks and template edits manually for project `hfnymqjrbppculcofaag`. The agent does **not** change hosted Auth or Resend settings.

## Single-attempt delivery checklist

Use **one** recent signup timestamp. Do not spam Resend while diagnosing rate limits.

1. **Authentication → Users**  
   Find the synthetic account. Note: exists? email confirmed? Do **not** delete or manually confirm.

2. **Logs → Auth**  
   Filter near the signup time. Record only event **category/code** and **timestamp** (signup, SMTP error, rate limit). No emails/tokens in notes.

3. **Resend → Emails**  
   Same window / recipient. Status must be one of: `not present`, `sent`, `delivered`, `bounced`, `suppressed`, `rejected`, `deferred`. Note safe diagnostic reason if shown. Check suppression list if bounced/suppressed.

4. **Authentication → Emails → SMTP Settings**  
   Custom SMTP enabled? Sender domain verified? From-address on that domain? Resend SMTP host correct?  
   **Do not** copy SMTP password or API keys.

5. **Recipient mailbox**  
   Inbox, Spam/Junk, Promotions, All Mail; search “Bridge Hive”.

### How to interpret (evidence only)

| Evidence | Likely class |
|----------|----------------|
| No Auth signup/email event | App/project mismatch or client never requested mail |
| Auth SMTP failure / rate limit | Supabase SMTP config or throttle |
| Auth handoff OK, Resend `not present` | Wrong Resend account or handoff failure |
| Resend bounced / suppressed | Recipient/domain delivery issue |
| Resend `delivered`, nothing in mailbox | Filters/forwarding on the recipient side |
| User already confirmed | Sign in / password recovery — do not create another user |

The check-email screen means **signup accepted confirmation flow**, not proof of SMTP delivery.

## Confirm signup email template (worker)

Separate from **Invite** and **Reset Password**.

Authentication → Email Templates → **Confirm signup**.

Preferred Confirm URL (token_hash + worker next; POST-only consume on `/auth/confirm`):

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/auth/worker/login">Confirm your email</a>
```

Requirements:

- `type=signup` (not `invite` / `recovery`)
- `next=/auth/worker/login` — **never** `/activate-organization-account`
- Site URL may stay the web app origin
- Redirect URLs allow-list must include web `/auth/confirm` and Expo worker origins used by `emailRedirectTo` (e.g. `http://localhost:8081/auth/worker/login`, `bridgehive://auth/worker/login`)

Leave org Invite / Reset Password templates on their existing paths.

## App `emailRedirectTo`

The worker app passes `emailRedirectTo` on `signUp` and `auth.resend({ type: 'signup' })` via Expo Linking to `/auth/worker/login`. That must be allow-listed; it must not point at organization activation.
