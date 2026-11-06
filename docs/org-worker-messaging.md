# Organization–worker messaging

1:1 **text-only** chat between an operational organization and a verified worker after shared approved work.

## First-version scope (locked)

- Text only (no attachments, calls, groups, community feed)
- Org send/list: **`org_admin` / `org_scheduler` only** (active membership)
- **No** `org_billing` messaging
- **No** platform-admin / broad support message reading
- **No** staff email digests
- Retention / deletion: **owner policy decision — not approved as indefinite retention**

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

- **Worker:** conversations where `worker_id = auth.uid()`
- **Org staff:** `organization_members.status = 'active'` + `org_admin` / `org_scheduler` via `has_org_role`
- **Demo workers:** RPCs raise `APP_REVIEW_DEMO_FORBIDDEN` (UI hide is not the control)
- Direct table inserts/updates/deletes revoked for `authenticated`; writes via SECURITY DEFINER RPCs only
- Realtime publication includes messages/conversations tables; row visibility still follows RLS select policies

## Limits (server)

Configurable via `platform_settings` (clients may mirror for UX only):

| Key | Default |
| --- | --- |
| `org_worker_message_max_length` | `2000` (table CHECK hard ceiling also 2000) |
| `org_worker_message_rate_limit_count` | `30` |
| `org_worker_message_rate_limit_window_seconds` | `60` |

`send_org_worker_message` raises `MESSAGE_BODY_TOO_LONG` / `MESSAGE_RATE_LIMITED`. Idempotent retries of the same `client_message_id` do not consume rate quota.

## Read state

- Per-user primary key `(conversation_id, user_id)`
- Candidate message must exist in the **same** conversation
- Cursor advances only when `(created_at, id)` is strictly after the previous read message — **not** UUID order alone
- Unread counts use the same `(created_at, id)` comparison against the stored read message

## Push (workers only)

- `org_worker_message` outbox; generic lock-screen body (never chat text)
- Enqueue only when sender is `organization_staff`; publication key = message id
- Android channel `org-messages`

## Owner decisions still open

| Topic | Current engineering default | Decision needed |
| --- | --- | --- |
| Retention / deletion | Rows persist until a policy is chosen | Retention window, erase path — **do not treat as legal approval** |
| Support read access | None | Whether support may view threads |
| `org_billing` messaging | Denied | Widen or keep |
| Staff email digests | Off | Keep off for v1 |
| Max length / rate | 2000 / 30 per 60s | Tune via settings if needed |

Do not invent approved legal wording beyond the in-product operational privacy warning.

## Post-deployment access / sync checks (required; currently NOT RUN)

These are **not** covered by source contract tests. Run only with separate approval; prefer staging / non-production fixtures:

1. Apply chat migration alone (do not bundle maps `042` or live PaymentIntent). Capacity migration is a **separate** payload — do not assume it is already applied.
2. As worker A (eligible): create conversation with org O; send message; confirm row + preview.
3. As worker B (other org / ineligible): cannot list O↔A; send/list RPC returns forbidden / empty.
4. As `org_billing` on O: no Messages nav effect for messaging RPCs; `MESSAGING_FORBIDDEN`.
5. As revoked former `org_scheduler`: loses list/send/select.
6. Demo worker: RPC deny even if UI entry forced.
7. Double-submit same `client_message_id`: one row; no second push event.
8. Exceed rate window: `MESSAGE_RATE_LIMITED`; over-length: `MESSAGE_BODY_TOO_LONG`.
9. Mark-read with older `(created_at, id)` or foreign conversation message id: no advance / `MESSAGE_NOT_FOUND`.
10. Two staff members: one reading does not clear the other’s unread.
11. Realtime: open thread, second client inserts, subscriber sees message; unsubscribe on leave.
12. Push path (non-prod Expo): staff send → worker device generic title/body; tap opens authorized conversation after session.

## Capacity vs chat

- Capacity guard file: `20261106121000_shift_capacity_occupancy_guard.sql` — **separate release**
- Chat file: `20261106122837_organization_worker_messaging.sql` — later timestamp only; **no functional dependency** on capacity

## Verification on this branch

**RUN:** domain/unit/contract tests listed in PR checks, typecheck, lint, web build, mobile export where noted.

**NOT RUN:** hosted migrate, live RLS isolation suite, hosted Realtime, device keyboard, lock-screen Expo, production conversations.
