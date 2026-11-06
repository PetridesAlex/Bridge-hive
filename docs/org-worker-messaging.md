# Organization–worker messaging

1:1 text chat between an operational organization and a verified worker after shared approved work.

## Eligibility (server-enforced)

A pair may message iff **all** of:

1. Worker `profiles.account_status = 'active'`
2. `worker_profiles.verification_status = 'verified'`
3. `worker_role` in `registered_nurse | ward_assistant | physiotherapist`
4. `is_app_review_demo = false`
5. Organization is operational (`status = 'active'`)
6. Exists `shift_assignments` joined to `shifts` **and** `timesheets` where the assignment and timesheet are both `approved` for that org + worker

Claimed seats, ended shifts, or completed shifts alone are **not** enough. Each worker on a multi-position shift qualifies independently.

## Permissions

- **Worker:** may list/send only on conversations where `worker_id = auth.uid()`
- **Org staff:** current `organization_members.status = 'active'` with `org_admin` or `org_scheduler` (same people who review timesheets). `org_billing` cannot message by default
- **Demo workers:** entry points hidden; RPCs raise `APP_REVIEW_DEMO_FORBIDDEN`
- Writes go through RPCs only (no direct message inserts)

## Conversation model

- One conversation per `(organization_id, worker_id)` (unique)
- Idempotent send via `client_message_id` unique per conversation
- **Per-user reads** (`organization_worker_conversation_reads`): one staff member reading does not clear unread for others
- No delivery/read receipts in the UI
- Text only; max length default **2000** characters
- Privacy banner: do not share patient information, credentials, or bank details

## Push (workers only)

- Event type `org_worker_message` via durable outbox
- Localized title: “New message from {org}” / “Νέο μήνυμα από {org}”
- Lock-screen body is generic (“Open BridgeHive to read it.”) — **never** the chat body
- Deep link `bridgehive://messages/<conversationId>` with session + eligibility recheck on open
- Separate Android channel `org-messages` (not `new-shifts`)
- Org staff: unread badge + Realtime only (no Expo push)

## Owner-review (not decided in this ship)

| Topic | Default now | Needs owner decision |
| --- | --- | --- |
| Retention / deletion | Keep messages indefinitely | Retention window, worker/org delete rights, GDPR erase path |
| Support / reporting access | No platform-admin message read path | Whether support may view threads for disputes |
| `org_billing` messaging | Denied | Whether billing can message workers |
| Staff email digests | Off | Optional unread email for schedulers |
| Max length | 2000 | Raise/lower for clinical ops |
| Attachments / calls / groups | Deferred | Product scope for later phases |

Do not invent approved legal wording for privacy notices beyond the in-product operational warning already shipped.

## Release notes

Migration: `20261106122837_organization_worker_messaging.sql` (after capacity guard `20261106121000`).

**Do not** mix maps `042` or live PaymentIntent work into the chat migrate/push. Apply chat from the messaging worktree only after capacity approval.

## Verification (this branch)

**RUN:** domain unit tests (eligibility, merge/idempotency helpers, push title/body, deep-link parser), web `org-dashboard` nav tests, mobile messaging gating/i18n tests, root `tsc`, mobile `tsc`, web eslint on messaging files, `git diff --check`, web `next build` (includes `/org/[slug]/messages`).

**NOT RUN:** pgTAP/dblink, hosted Supabase migrate / Realtime, physical device keyboard, lock-screen Expo push, production conversations, EAS / TestFlight, merge to main.
