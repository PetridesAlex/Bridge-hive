# Bridge Hive Design System (Phase 7A — Dynamic premium)

**Personality:** Clinical confidence with human warmth.

Bridge Hive should feel dependable for healthcare operations, fast enough for shift work, and warmer than hospital software—more colorful than a sterile dashboard, without becoming playful.

Organization dashboard, platform-admin dashboard, and the public website are **out of scope** until Phase 7B+.

---

## Brand principles

- Professional, calm, reliable, human, clear, efficient
- White-dominant canvas (~70%); navy for trust structure (~20%); teal for interaction (~7%); honey signature (~3%)
- Healthcare-aware without medical clichés

### Avoid

- Navy hero slabs on routine screens; card-around-everything
- Teal or honey as small body text on white unless contrast passes
- Large gradients, neon, glassmorphism, honeycomb wallpaper
- Truncated tab labels; color-only status; decorative endless motion

---

## Shared tokens

Package: [`packages/design-tokens`](../packages/design-tokens) · mobile map: [`apps/worker-mobile/constants/theme.ts`](../apps/worker-mobile/constants/theme.ts)

### Color palette

| Token | Hex | Notes |
|---|---|---|
| Brand ink | `#0B2A43` | Primary actions, high-trust text |
| Brand ink strong | `#071D30` | Pressed primary |
| Brand teal | `#16A6B6` | Selected nav, progress, filters |
| Brand teal strong | `#087F8C` | Pressed interactive |
| Brand teal soft | `#E4F7F9` | Soft interactive fills |
| Brand honey | `#E0AA18` | Signature accent only |
| Brand honey soft | `#FFF5D6` | Soft signature surfaces |
| Canvas | `#F5F7F8` | App background |
| Surface | `#FFFFFF` | Cards / list groups |
| Surface subdued | `#EDF2F4` | Subtle fills |
| Border | `#E1E7EA` | Default borders |
| Text primary | `#102331` | Body |
| Text secondary | `#5F6F79` | Supporting |
| Text muted | `#7D8A92` | Captions |
| Success | `#198754` | Soft `#E7F6ED` |
| Warning | `#A56800` | Soft `#FFF2CC` |
| Danger | `#B42318` | Soft `#FDECEA` |
| Info | `#1769AA` | Soft `#E8F2FC` |

**Roles:** Navy = primary CTAs; Teal = interactive selection/progress; Honey = brand markers; Green/Amber/Red/Blue = semantic status (always with label + icon).

### Navigation

Five visible tabs: **Home · Shifts · Work · Money · More**

- Money = `payments` route; More = `profile` route (labels only)
- Work = `(tabs)/work` using existing assignment queries
- Invoices remains registered with `href: null`

Selected tab: teal icon/text + small navy or honey indicator. White bar, hairline top border.

---

## Accessibility

- Normal text ≥ 4.5:1; essential UI ≥ 3:1
- Status via label/icon + color
- Touch targets ≥ 44×44 when practical
- Respect reduced motion (150–220 ms otherwise)
- Do not claim formal WCAG certification from Phase 7A alone

---

## Out of scope (Phase 7A)

- Organization / platform-admin / public website redesign
- Database / RLS / Edge / Stripe behavior changes
- Dark mode shipping; new third-party UI frameworks
- Reference-only features (Time Off, Reimburse, Performance, chat)
