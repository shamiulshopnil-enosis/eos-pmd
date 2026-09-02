---
name: EOS Enterprise
description: A restrained enterprise workspace for C-level review — neutral surfaces, one blue accent, subtle elevation over borders, dense 8px rhythm, 3px control radius. Modelled on the Atlassian Design System.
colors:
  paper: "#f7f8f9"
  panel: "#ffffff"
  raised: "#ffffff"
  band: "#f1f2f4"
  hover: "#f7f8f9"
  rule: "#dfe1e6"
  rule-strong: "#b3b9c4"
  ink: "#172b4d"
  ink-muted: "#626f86"
  ink-subtle: "#8590a2"
  link: "#1868db"
  link-strong: "#0055cc"
  link-subtle-bg: "#e9f2fe"
  rag-good: "#216e4e"
  rag-good-fill: "#22a06b"
  rag-good-bg: "#dcfff1"
  rag-warn: "#7f5f01"
  rag-warn-fill: "#e2b203"
  rag-warn-bg: "#fff7d6"
  rag-bad: "#ae2e24"
  rag-bad-fill: "#ca3521"
  rag-bad-bg: "#ffeceb"
  focus: "#388bff"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.17
  headline:
    fontFamily: "system-ui"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.25
  section:
    fontFamily: "system-ui"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  metric:
    fontFamily: "system-ui"
    fontSize: "1.625rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "'tnum' 1"
  body:
    fontFamily: "system-ui"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  small:
    fontFamily: "system-ui"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  label:
    fontFamily: "system-ui"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.45
    textTransform: "uppercase"
rounded:
  control: "3px"
  card: "8px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
elevation:
  raised: "0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)"
  overlay: "0 4px 8px -2px rgba(9,30,66,0.18), 0 0 1px rgba(9,30,66,0.31)"
components:
  button-primary:
    backgroundColor: "{colors.link}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "6px 12px"
    fontWeight: 500
  button-default:
    backgroundColor: "rgba(9,30,66,0.06)"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  button-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
  lozenge:
    backgroundColor: "{colors.band}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
    padding: "2px 6px"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule-strong}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  card:
    backgroundColor: "{colors.panel}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.card}"
    padding: "20px"
  table-header:
    textColor: "{colors.ink-muted}"
    fontSize: "0.75rem"
    fontWeight: 600
  overlay:
    backgroundColor: "{colors.raised}"
    borderColor: "{colors.rule}"
    rounded: "6px"
    shadow: "{elevation.overlay}"
  nav-link:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
    padding: "7px 10px"
  nav-link-active:
    backgroundColor: "{colors.link-subtle-bg}"
    textColor: "{colors.link-strong}"
    fontWeight: 600
---

# Design System: EOS Enterprise

## Overview

The workspace is a **restrained enterprise console** for executives who review delivery
performance. It is modelled on the **Atlassian Design System** (Jira): neutral surfaces,
a single blue accent, information density, and calm. Elevation and whitespace do the work
that heavy borders and shouty labels used to do.

The UI is built on the **PrimeReact** component library (`primereact@10`, `primeicons`),
retheming Lara through CSS variables in `src/app/globals.css`. Light is the primary theme;
dark is a first-class peer, toggled by `ThemeToggle` and set before first paint by the
inline script in `src/app/layout.tsx` from `localStorage['eos-theme']` or the OS setting.

**Key characteristics**

- Neutral palette: `#F7F8F9` page, `#FFFFFF` surfaces, `#172B4D` text, `#DFE1E6` hairlines.
- One accent — Atlassian blue `#1868DB` — for primary actions, links, focus and the active
  nav item. It is the only saturated hue outside of status.
- **3px** radius on controls (buttons, inputs, lozenges), **8px** on cards, tables and
  dialogs. No sharp 2px corners, no chunky pills.
- Elevation over borders: menus, popovers, dialogs and the mobile drawer float on a soft
  shadow (`elevation.overlay`) with a 1px hairline — never a 2px outline.
- The system font stack. No webfont, no separate monospace face — figures use the same
  face with `font-variant-numeric: tabular-nums`.
- Status colour (RAG) is reserved for state, always shown as a soft-tint **lozenge** or a
  small disc + word, never as the only channel.
- Dense 8px rhythm; comfortable but not airy.

## Colors

### Surfaces
- **Page** (`paper` `#F7F8F9` / dark `#161A1D`): the app background, one step below cards.
- **Surface** (`panel` `#FFFFFF` / dark `#1D2125`): cards, the nav rail, table bodies, form panels.
- **Raised** (`raised` `#FFFFFF` / dark `#22272B`): menus, dialogs, popovers, the drawer.
- **Band** (`band` `#F1F2F4` / dark `#22272B`): selected-neutral, chips, zebra.
- **Hover** (`hover` `#F7F8F9` / dark `#22272B`): row and menu-item hover — very light.

### Lines
- **Rule** (`#DFE1E6` / dark `#2C333A`): every hairline divider, card and table border.
- **Rule strong** (`#B3B9C4` / dark `#454F59`): input borders, stronger dividers.

### Text
- **Ink** (`#172B4D` / dark `#C7D1DB`): body copy and headings.
- **Ink muted** (`#626F86` / dark `#96A0AF`): secondary text, captions, table headers, nav rest.
- **Ink subtle** (`#8590A2` / dark `#738496`): placeholders, disabled, sort glyphs.

### Accent
- **Link** (`#1868DB` / dark `#579DFF`): primary button fill, text links, focus ring seed,
  active-nav text and icon. **Hover** `link-strong` `#0055CC` / dark `#85B8FF`.
- **Link subtle bg** (`#E9F2FE` / dark `#1C2B41`): active nav background, selected menu item,
  info lozenge and info message fill.

### Status (RAG)
Each hue has a **text tone**, a **solid fill** (discs, meters, message rules) and a **subtle
background** (lozenges, banners):
- **Good** `#216E4E` / `#22A06B` / `#DCFFF1`
- **Warn** `#7F5F01` / `#E2B203` / `#FFF7D6`
- **Bad**  `#AE2E24` / `#CA3521` / `#FFECEB`

### Named rules
**The one-accent rule.** Blue is the only saturated non-status colour. It never appears as a
surface tint beyond `link-subtle-bg`, and status green/amber/red never emphasise a heading
or a link.

**The elevation rule.** A surface that floats (menu, dialog, drawer, popover) earns
separation with `elevation.overlay` + a 1px `rule` hairline. A surface that contains
(card, table, panel) gets a 1px `rule` border and no shadow.

## Typography

**Family:** the system UI stack — `-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter",
Roboto, "Helvetica Neue", Arial, sans-serif` — for everything. There is no display face and
no monospace face; a figure in running text is the same font with tabular numerals.

**Scale** (rem / Tailwind steps only)
- **Page title** — 1.5rem / 600 / 1.17 (`PageHeader` h1).
- **Card & empty-state title** — 1rem / 600.
- **Section heading** — 0.875rem / 600, sentence case, no underline (`SectionHeading`).
- **Metric** — 1.625rem / 600, `tabular-nums` (dashboard `FigureBlock`, large ratings).
- **Body** — 0.875rem / 400 / 1.43. All prose and UI text.
- **Small** — 0.75rem / 400. Captions, hints, meta.
- **Label** — 0.6875rem / 700, uppercase, tracked 0.02em. Field labels and **lozenges only**.

### Named rules
**The quiet-heading rule.** Section headings are 14px semibold sentence case with no rule
beneath them — hierarchy comes from size, weight and spacing, not decoration. The only
uppercase text in the product is the field `label` and the lozenge.

**The tabular-figure rule.** Every figure, id, date, count and table numeral carries
`tabular-nums` so columns align, but stays in the system face. `.font-mono` and `.tnum`
resolve to the sans stack + tabular numerals.

## Layout

**App shell (`NavShell`).** A fixed 15rem (`w-60`) rail on `panel` with a `rule` right
border: the "EOS / Performance Monitoring" wordmark, the "Register" nav group (`NavLinks`,
a PrimeReact `Menu`), and the signed-in identity + `ThemeToggle`. Below `md` the rail
collapses into a PrimeReact `Sidebar` behind a bars icon. The header carries a
`Company / Workspace` breadcrumb and the activity **Log** (`OverlayPanel`). Content column:
centred, `max-width: 1180px`, `px-4 py-7 md:px-8`.

**Auth cover (`AuthShell`).** Centred `max-w-md` column: wordmark, 1.5rem/600 title, optional
intro, one PrimeReact `Card`, optional footer note. Used by `/login` and `/invite/[code]`.

**Admin shell (`admin/layout.tsx`).** Lighter — no rail. `band` page ground, a
`border-b border-rule bg-panel` header with an ink "EOS" chip, plain links, and a text
"Sign out" button. `max-w-5xl` centred main.

**Screens.**
- Dashboard: a full-width vertical stack — a `grid gap-3 sm:grid-cols-3` of `FigureBlock`
  cards (8px radius, 1px `rule`, big metric), then a two-column Attention / Rating-trend
  row, then the Client ledger (`DataTable`, row-expansion) and the Project-performance
  `DataTable` at full width.
- Project / milestone detail: `grid lg:grid-cols-[minmax(0,1fr)_18rem]` — wide overview
  beside a narrow bordered performance rail.
- Forms: `mx-auto max-w-3xl` inside a `Card`, fields in `space-y-6`, closing with
  `FormActions` (right-aligned bar over a `border-t border-rule pt-5`).

## Elevation & Depth

Two shadows only:
- `elevation.raised` — `0 1px 1px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31)` — reserved
  for future raised cards / draggable items.
- `elevation.overlay` — `0 4px 8px -2px rgba(9,30,66,.18), 0 0 1px rgba(9,30,66,.31)` —
  every floating surface: `Dropdown`/`AutoComplete` panels, `Calendar`, `OverlayPanel`,
  `Menu` overlays, `Dialog`, `Sidebar`, tooltips.

Focus is a 2px `focus` (`#388BFF`) ring at 1px offset on `:focus-visible`; buttons use a
2px panel gap + 2px ring. Inputs shift their border to `link` and add a 1px inset ring — no
fat halo.

## Shapes

- `rounded.control` **3px** — buttons, inputs, lozenges, radio/checkbox, nav links, file button.
- `rounded.card` **8px** — cards, `DataTable`, filter `Panel`, `EmptyState`, `Dialog`.
- Overlay panels/menus **6px**.
- `rounded.pill` **999px** — count `Badge`, the score meter track, RAG discs.

No borders thicker than 1px. No sharp corners.

## Components

### Buttons (PrimeReact `Button`)
- **Shape:** 3px radius, `6px 12px` padding, 14px / 500, icon+label gap `6px`.
- **Primary:** solid `link` fill, white text; hover `link-strong`. One per view — the page's
  main action (`InkButton` / `InkLink` / `SubmitButton` default).
- **Default:** subtle grey fill `rgba(9,30,66,.06)`, `ink` text, **no border**; hover
  `rgba(9,30,66,.12)` (`GhostButton` / `GhostLink` / `SecondaryButton` / `SubmitButton
  variant="outlined"`). This replaces the old bordered "ghost" button.
- **Subtle / text:** transparent, `ink-muted` text, subtle hover fill (`SubmitButton
  variant="text"`, toolbar and inline actions).
- **Danger:** `rag-bad-fill` solid, or text/`rag-bad` for destructive inline links.
- **Icon button** (`ThemeToggle`, mobile trigger): 32px square, transparent, subtle hover.

### Lozenges (`Badge` → PrimeReact `Tag`)
- Soft-tint **filled** rectangle, 3px radius, `2px 6px`, 11px / 700, uppercase, `nowrap`.
- Tone → fill / text: `slate` band/`ink-muted`; `blue` `link-subtle-bg`/`link-strong`;
  `green`/`amber`/`red` the matching RAG `-bg`/text. `purple` aliases `blue`.
- Wrappers: `ProjectStatusBadge`, `MilestoneStatusBadge`, `ProjectTypeBadge`,
  `AdminStatusBadge`, `ExecutionStatusBadge`, `FlagBadge` (leading glyph).
- `HealthBadge` — a small coloured PrimeIcon + uppercase word, colour keyed to health.
- `RagDisc` — a 10px inset-ring disc; always paired with a word nearby.

### Cards / containers (`Card` → PrimeReact `Card`)
- `panel` background, 1px `rule` border, **8px** radius, **no shadow**, `20px` body padding.
- `EmptyState` — solid (not dashed) `rule` border, centred subtle icon, 16px/600 title.

### Inputs (`form.tsx`, PrimeReact `InputText` / `InputTextarea` / `Dropdown` / `Calendar`)
- `w-full`, 3px radius, 1px `rule-strong` border, `panel` bg, 14px, `6px 10px`.
- Hover → `ink-subtle` border. Focus → `link` border + `inset 0 0 0 1px link`.
- `Field` renders an uppercase `label` caption; required marker is a `rag-bad` asterisk;
  hints sit below in `small` `ink-muted`.
- `RadioCards` — full-width tappable rows with a real PrimeReact `RadioButton`; checked →
  `link` border + `band` fill.
- `FileInput` — native `<input type=file>` (server actions read it); the file button is
  themed to the **default** button (`rgba(9,30,66,.06)`), 3px radius.

### DataTable (PrimeReact `DataTable`, the primary data surface)
- Wrapper: 1px `rule`, 8px radius, `overflow: hidden`, horizontal scroll inside.
- Header cells: 12px / 600 `ink-muted`, **sentence case**, no tracking, `10px 12px`.
- Body cells: 14px, `9px 12px`, bottom hairline `rule` only (last row none).
- Row hover `hover`; row-expansion panel on `paper`, no cell padding.
- Sort glyph `ink-subtle` → `link` when active; row toggler 24px, subtle hover.
- No paginator styling — lists are shown in full.

### Score meter (`StarRating` — deliberately not stars)
A numeric value (`X.X`, 14px/500 or 24px for `size="lg"`) + a thin 34×4px (56×6px large)
pill track with a proportional fill coloured by band (`≥4` good, `≥3` warn, else bad).
Null renders "Not rated". Display only.

### Navigation (`NavLinks` → PrimeReact `Menu`)
Vertical list; each item 3px radius, `7px 10px`, 14px / 500, `ink-muted` with an
`ink-subtle` glyph. Hover → subtle fill + `ink`. Active (`aria-current="page"`) →
`link-subtle-bg` fill, `link-strong` text and glyph, 600.

### Overlays (`Dialog`, `OverlayPanel`, `Sidebar`, `Menu`, dropdown/autocomplete/calendar panels)
`raised` background, 1px `rule`, 6–8px radius, `elevation.overlay` shadow. `Dialog` header
is 16px / 600 sentence case over a `rule` divider. Mask `rgba(9,30,66,.54)` /
dark `rgba(0,0,0,.6)`.

### Charts (`TrendChart` → PrimeReact `Chart`, `Sparkline`)
`Chart type="line"`: a 1.75px `ink` line, square markers, `rule` gridlines, `ink-muted`
11px tabular axis labels, no legend. `Sparkline` stays inline SVG, `currentColor`, em-dash
when empty.

## Do's and Don'ts

### Do
- Build surfaces as `panel` + 1px `rule` + 8px radius on the `paper` page.
- Put the one primary action per view in a blue `Button`; everything else is the subtle
  default or a text button.
- Give every floating surface `elevation.overlay`, never a 2px border.
- Set section headings in 14px semibold sentence case with no underline.
- Set figures with `tabular-nums` in the system face.
- Render status as a soft-tint lozenge or disc + word; keep blue for actions and links only.
- Keep 3px on controls, 8px on cards, 6px on menus.

### Don't
- Reintroduce the warm "paper/ink" palette, a webfont, a monospace face, 2px corners, or
  the hairline `gap-px` grid.
- Use bordered / transparent lozenges, ALL-CAPS tracked headings, or heavy section rules.
- Add a `box-shadow` to a card, or a 2px border to a dropdown.
- Render stars for a rating — use the numeric score + meter.
- Colour a heading or link with a RAG hue, or use blue as a surface tint beyond
  `link-subtle-bg`.

## Coverage

The system covers the whole product: the `(app)` route group and its forms, the shared
shell (`NavShell` / `NavLinks` / `AppChrome`), the auth cover (`AuthShell`, `/login`,
`/invite/[code]`), the admin area, the client review flow (`MilestoneReviewForm`), every
`src/components/*` widget, and the token + skin layer in `src/app/globals.css`. Public Sans,
Roboto Mono and Material Symbols are removed; PrimeReact + PrimeIcons + a system font stack
are the whole vocabulary.
