# Bridge Hive official logo source

## Source of truth
- File: `brand/source/bridge-hive-logo-blue-background.png`
- Format: PNG RGBA 1024×1024, fully opaque (white canvas around the mark)
- Artwork: rounded-square dark navy tile with white stylized **B** and gold/orange hexagon
- The navy rounded tile is part of the official mark — do not remove it or invent a transparent standalone B

## Notes from inspection
- Attachment was provided as PNG (not SVG). Filename in prompts may say `.svg`; the binary is PNG.
- Outer canvas is near-white (#FDFDFD) with a soft drop shadow; trim derivatives remove excess white canvas only.
- Working square trim: `brand/source/bridge-hive-logo-blue-background.trim-square.png`

## Derivative naming (versioned for cache safety)
Web (`apps/web/public/brand/`):
- `bridge-hive-logo-v2-64.png`
- `bridge-hive-logo-v2-180.png`
- `bridge-hive-logo-v2-192.png`
- `bridge-hive-logo-v2-512.webp` (and PNG fallback if needed)
- `bridge-hive-logo-v2-1024.png` (display/OG mark)

Expo (`apps/worker-mobile/assets/images/`):
- `icon.png` (1024)
- `splash-icon.png`
- `favicon.png`
- `android-icon-foreground.png` / `android-icon-background.png` / `android-icon-monochrome.png`
