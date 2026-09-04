---
name: EOS Enterprise
description: A restrained enterprise console for reviewing delivery performance — neutral surfaces, one navy accent, elevation over borders, a dense 8px rhythm, 3px control radius. Atlassian-modelled, on PrimeReact.
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
  link: "#22488f"
  link-strong: "#17356b"
  link-subtle-bg: "#eaf0f9"
  input-bg: "#f1f2f4"
  input-border: "#8993a4"
  subtle-btn: "rgba(9,30,66,0.06)"
  focus: "#4c8dff"
  rag-good: "#216e4e"
  rag-good-fill: "#22a06b"
  rag-good-bg: "#dcfff1"
  rag-warn: "#7f5f01"
  rag-warn-fill: "#e2b203"
  rag-warn-bg: "#fff7d6"
  rag-bad: "#ae2e24"
  rag-bad-fill: "#ca3521"
  rag-bad-bg: "#ffeceb"
  chip-blue-bg: "#eaf2fe"
  chip-blue-fg: "#1d4fd8"
  chip-indigo-bg: "#eeecfe"
  chip-indigo-fg: "#5b3ff0"
  chip-green-bg: "#e3faf0"
  chip-green-fg: "#0f9d58"
  chip-amber-bg: "#fff4d6"
  chip-amber-fg: "#b45f06"
  chip-orange-bg: "#ffedd9"
  chip-orange-fg: "#c2410c"
  chip-purple-bg: "#f1ebfe"
  chip-purple-fg: "#7c3aed"
  chip-teal-bg: "#e1f7f5"
  chip-teal-fg: "#0f766e"
  chip-rose-bg: "#ffe7ec"
  chip-rose-fg: "#be123c"
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
  field-label:
    fontFamily: "system-ui"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
  lozenge:
    fontFamily: "system-ui"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0.02em"
    textTransform: "uppercase"
rounded:
  control: "3px"
  overlay: "6px"
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
  button-primary-hover:
    backgroundColor: "{colors.link-strong}"
    textColor: "#ffffff"
  button-default:
    backgroundColor: "{colors.subtle-btn}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  button-default-hover:
    backgroundColor: "rgba(9,30,66,0.12)"
  button-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
  button-danger:
    backgroundColor: "{colors.rag-bad-fill}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
  lozenge:
    backgroundColor: "{colors.band}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
    padding: "2px 6px"
    typography: "{typography.lozenge}"
  lozenge-info:
    backgroundColor: "{colors.link-subtle-bg}"
    textColor: "{colors.link-strong}"
  lozenge-success:
    backgroundColor: "{colors.rag-good-bg}"
    textColor: "{colors.rag-good}"
  input:
    backgroundColor: "{colors.input-bg}"
    textColor: "{colors.ink}"
    borderColor: "{colors.input-border}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
    height: "40px"
  input-focus:
    backgroundColor: "{colors.panel}"
    borderColor: "{colors.link}"
  card:
    backgroundColor: "{colors.panel}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.card}"
    padding: "20px"
  table-header:
    textColor: "{colors.ink-muted}"
    typography: "{typography.small}"
    fontWeight: 600
    padding: "10px 12px"
  overlay:
    backgroundColor: "{colors.raised}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.overlay}"
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

**Creative North Star: "The Delivery Console"**

EOS Performance Monitoring is where a delivery lead answers one question — *which client
is drifting?* — and acts on it. The interface is a **restrained enterprise console**
modelled on the Atlassian Design System (Jira): neutral surfaces, a single navy accent,
information density, and calm. Whitespace and a soft shadow do the work that heavy borders
and ALL-CAPS labels used to do. Nothing shouts; the data does the talking, and the one
blue thing on a screen is the thing to click.

The UI is built on the **PrimeReact** component library (`primereact@10`, `primeicons`),
retheming its Lara base through CSS custom properties in `src/app/globals.css`. Light is
the primary theme; dark is a first-class peer, toggled by `ThemeToggle` and applied before
hydration by a `next/script` `beforeInteractive` guard reading `localStorage['eos-theme']`
or the OS setting.

**Key characteristics**

- Neutral palette: `#F7F8F9` page, `#FFFFFF` surfaces, `#172B4D` text, `#DFE1E6` hairlines.
- One accent — **Enosis navy `#22488F`** — for primary actions, links, focus, and the
  active nav item. The only saturated hue outside of status.
- **3px** radius on controls, **6px** on overlays/menus, **8px** on cards, tables and
  dialogs. No sharp 2px corners; no chunky pills.
- Elevation over borders: menus, popovers, dialogs, toasts and the mobile drawer float on
  `elevation.overlay` + a 1px `rule` hairline — never a 2px outline.
- The system font stack, everywhere. No webfont, no monospace face; figures are the same
  face with `font-variant-numeric: tabular-nums`.
- Form fields are **filled** (`input-bg`) with a clearly visible 1px `input-border` and a
  40px min height — a field always reads as a field.
- Status (RAG) is reserved for state — a soft-tint lozenge or a disc + word, never the
  only channel.
- Dense 8px rhythm; comfortable, not airy.

## Colors

A cool neutral field with one navy accent and three reserved status hues. Every value has
a light and a dark form; design to the role, not the hex.

### Primary
- **Enosis Navy** (`link` `#22488F` / dark `#7DB0FF`): the primary button fill, every text
  link, the focus-ring seed, and the active nav item's text and icon. Hover deepens to
  `link-strong` (`#17356B` / dark `#A6CBFF`).
- **Navy Wash** (`link-subtle-bg` `#EAF0F9` / dark `#1B2C46`): the active nav background,
  the selected menu/dropdown item, the `info` lozenge and `info` message fill, and a
  checked `RadioCards` row. The only place navy appears as a surface tint.

### Neutral
- **Page** (`paper` `#F7F8F9` / dark `#161A1D`): the app background, one step below cards.
- **Surface** (`panel` `#FFFFFF` / dark `#1D2125`): cards, the nav rail, table bodies,
  form panels, the admin header.
- **Raised** (`raised` `#FFFFFF` / dark `#22272B`): menus, dialogs, popovers, toasts, the
  drawer — always paired with `elevation.overlay`.
- **Band** (`band` `#F1F2F4` / dark `#22272B`): selected-neutral, autocomplete chips,
  zebra, the score-meter track.
- **Hover** (`hover` `#F7F8F9` / dark `#22272B`): table-row and menu-item hover — very light.
- **Rule** (`#DFE1E6` / dark `#2C333A`): every hairline — card and table borders, dividers,
  overlay outlines. **Rule strong** (`#B3B9C4` / dark `#454F59`): scrollbar thumb, a few
  heavier dividers.
- **Input border** (`#8993A4` / dark `#738496`): the resting border on every form control,
  over a filled `input-bg` (`#F1F2F4` / dark `#22272B`). Hover darkens both.
- **Ink** (`#172B4D` / dark `#C7D1DB`): body copy and headings. **Ink muted** (`#626F86` /
  dark `#96A0AF`): secondary text, captions, table headers, resting nav. **Ink subtle**
  (`#8590A2` / dark `#738496`): placeholders, disabled text, sort glyphs, trigger icons.
- **Subtle button** (`subtle-btn` `rgba(9,30,66,.06)` / dark `rgba(161,189,217,.08)`): the
  default (non-primary) button and icon-button fill; hover ≈ `rgba(9,30,66,.12)`.

### Tertiary — Status (RAG)
Each hue carries a **text tone**, a **solid fill** (discs, meters, message rules), and a
**subtle background** (lozenges, banners, message fills):
- **Good** `#216E4E` / `#22A06B` / `#DCFFF1`  (dark `#7EE2B8` / `#2ABB7F` / `#1C3329`)
- **Warn** `#7F5F01` / `#E2B203` / `#FFF7D6`  (dark `#F5CD47` / `#CF9F02` / `#332E1B`)
- **Bad**  `#AE2E24` / `#CA3521` / `#FFECEB`  (dark `#FD9891` / `#E2483D` / `#42221F`)

### Named Rules
**The One-Accent Rule.** Navy is the only saturated colour used for *action* — buttons,
links, focus, the active nav item — and status green/amber/red never emphasise a heading,
a link, or a figure that isn't itself a concerning count. The one bounded exception is
**field icon chips** (below): a fixed, categorical palette that labels *what kind of field
this is* in a dense overview panel. Chips are never clickable, never carry a RAG meaning,
and never appear outside that one job — everything actionable is still navy-or-neutral.

**The Field-Fill Rule.** A control is a filled `input-bg` panel with a 1px `input-border`
— never a borderless line of text on the card surface. Focus swaps the fill to white and
the border to `link`.

## Typography

**Family:** the system UI stack — `-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter",
Roboto, "Helvetica Neue", Arial, sans-serif` — for everything, including figures. There is
no display face and no monospace face; `--font-mono` and `--font-display` both resolve to
the sans stack.

**Character:** native, quiet, precise. Hierarchy comes from size, weight and spacing —
never a change of voice or a decorative rule.

### Hierarchy
- **Display / page title** — 1.5rem / 600 / 1.17 (`PageHeader` h1).
- **Headline** — 1rem / 600. Card titles, empty-state titles, dialog headers.
- **Section heading** — 0.875rem / 600, sentence case, **no underline** (`SectionHeading`).
- **Metric** — 1.625rem / 600, `tabular-nums` (dashboard `FigureBlock`, large ratings).
- **Body** — 0.875rem (14px) / 400 / 1.43. All prose and UI text; PrimeReact components
  inherit `.p-component { font-size: 0.875rem }`. Form **controls** render at 16px so
  mobile Safari never zooms on focus.
- **Small** — 0.75rem / 400. Hints, captions, meta, table-cell dates.
- **Field label** — 0.75rem / 600, sentence case (`Field`). A red `*` marks required; an
  optional `(optional)` suffix marks the inverse.
- **Lozenge** — 0.6875rem / 700, **uppercase**, tracked 0.02em, `nowrap`. The one place
  ALL-CAPS is correct.

### Named Rules
**The Quiet-Heading Rule.** Section headings are 14px semibold sentence case with nothing
drawn beneath them. Uppercase is confined to lozenges and a handful of structural eyebrow
captions (the "Register" nav group label, "Signed in", the auth wordmark) — never a field
label, a section heading, or a table header.

**The Tabular-Figure Rule.** Every figure, id, date, count and table numeral carries
`tabular-nums` (`.font-mono` / `.tnum` add it) so columns align, while staying in the
system face.

## Layout

**App shell (`NavShell`).** A fixed 15rem (`w-60`) rail on `panel` with a `rule` right
border: the "EOS / Performance Monitoring" wordmark, the "Register" nav group (`NavLinks`,
a PrimeReact `Menu`), and the signed-in identity + `ThemeToggle`. Below `md` the rail
collapses into a PrimeReact `Sidebar` behind a bars icon. The sticky header carries a
`Breadcrumbs` trail — `{company} / {section}`, where the section links back to its list —
and the activity **Log** (`OverlayPanel`). Content column: centred, `max-width: 1180px`,
`px-4 py-7 md:px-8`.

**Auth cover (`AuthShell`).** Centred `max-w-md` column: wordmark, 1.5rem/600 title,
optional intro, one PrimeReact `Card`, optional footer note. `/login` and `/invite/[code]`.

**Admin shell (`admin/layout.tsx`).** Lighter — no rail. `band` page ground, a
`border-b border-rule bg-panel` header with a navy "EOS" chip, plain links, and a text
"Sign out" button. `max-w-5xl` centred main.

**Screens.**
- Dashboard: a full-width vertical stack — a `grid gap-3 sm:grid-cols-3` of `FigureBlock`
  cards (8px radius, 1px `rule`, big metric), then a two-column Attention / Rating-trend
  row, then the Client ledger (`DataTable`, row-expansion) and the Project-performance
  `DataTable` at full width.
- Project / milestone detail: `grid lg:grid-cols-[minmax(0,1fr)_18rem]` — a wide Overview
  `Card` (field icon chips in a 3-column grid) beside a narrower Performance `Card` (a
  `StatRow` stack).
- Forms: `mx-auto max-w-3xl` inside a `Card`, fields in `space-y-6`, closing with
  `FormActions` (right-aligned bar over a `border-t border-rule pt-5`). Short fields
  (dates, counts) take a `Field width` of `xs`–`lg` so width hints at the expected input.

**Rhythm.** An 8px grid: `4 / 8 / 12 / 16 / 24 / 32`. Form fields `space-y-6`; grouped
sub-fields `gap-3`–`gap-5`; card padding `20px`; table cells `9px 12px`.

## Elevation & Depth

Two shadows, no more.

### Shadow Vocabulary
- **`elevation.raised`** (`0 1px 1px rgba(9,30,66,.25), 0 0 1px rgba(9,30,66,.31)`;
  dark `0 1px 1px rgba(3,4,4,.5), 0 0 1px rgba(3,4,4,.6)`): reserved for future raised /
  draggable cards. Not currently applied at rest.
- **`elevation.overlay`** (`0 4px 8px -2px rgba(9,30,66,.18), 0 0 1px rgba(9,30,66,.31)`;
  dark `0 8px 12px rgba(3,4,4,.36), 0 0 1px rgba(3,4,4,.6)`): **every** floating surface —
  `Dropdown` / `AutoComplete` / `Calendar` panels, `OverlayPanel`, `Menu` overlays,
  `Dialog`, `Sidebar`, `Toast`, tooltips — always with a 1px `rule` hairline, never a
  thick border.

Containers (`Card`, `DataTable`, filter `Panel`) get a 1px `rule` border and **no shadow**.

### Named Rules
**The Elevation Rule.** A surface that floats earns separation with `elevation.overlay` +
a 1px `rule`. A surface that contains earns it with a 1px `rule` and nothing else. There
is no third option and no `box-shadow` on a card.

**The Focus Rule.** Keyboard focus is a 2px `focus` (`#4C8DFF` / dark `#7DB0FF`) ring at
1px offset on `:focus-visible`; buttons draw it as `0 0 0 2px panel, 0 0 0 4px focus`.
Inputs instead shift their border to `link` and add a tight `0 0 0 1px link` ring — never
a fat halo.

## Shapes

- `rounded.control` **3px** — buttons, inputs, lozenges, radio/checkbox, nav links, menu
  items, the file-selector button.
- `rounded.overlay` **6px** — dropdown / autocomplete / calendar panels, `OverlayPanel`,
  `Menu` overlays, `Toast`.
- `rounded.card` **8px** — cards, `DataTable`, filter `Panel`, `EmptyState`, `Dialog`,
  `FigureBlock`.
- `rounded.pill` **999px** — count `Badge`, the score-meter track, `RagDisc`.

Borders are 1px everywhere. No sharp corners, no pills on buttons or lozenges.

## Components

### Buttons (PrimeReact `Button`, wrapped as `InkButton` / `GhostButton` / `SubmitButton`)
- **Shape:** 3px radius, `6px 12px` padding, 14px / 500, icon+label gap `6px`.
- **Primary:** solid `link` fill, white text; hover `link-strong`. One per view.
- **Default:** `subtle-btn` grey fill, `ink` text, **no border**; hover `rgba(9,30,66,.12)`
  (`GhostButton` / `GhostLink` / `SecondaryButton` / `SubmitButton variant="outlined"`).
- **Subtle / text:** transparent, `ink-muted` text, `subtle-btn` hover fill.
- **Danger:** `rag-bad-fill` solid white, or `text` + `rag-bad` (hover `rag-bad-bg`) for
  destructive inline actions.
- **Icon button** (`ThemeToggle`, mobile trigger, `MoreActions` `…`): 32px square,
  transparent, `subtle-btn` hover.
- **Disabled:** `opacity: .45`.

### Lozenges (`Badge` → PrimeReact `Tag`)
- Soft-tint **filled** rectangle: 3px radius, `2px 6px`, 11px / 700, uppercase, `nowrap`,
  **no border**.
- Tone → fill / text: `slate` `band` / `ink-muted`; `blue` `link-subtle-bg` /
  `link-strong`; `green` / `amber` / `red` the matching RAG `-bg` / text tone. `purple`
  aliases `blue`.
- Wrappers: `ProjectStatusBadge`, `MilestoneStatusBadge`, `ProjectTypeBadge`,
  `AdminStatusBadge`, `ExecutionStatusBadge`, `FlagBadge` (leading PrimeIcon).
- `HealthBadge` — a small coloured PrimeIcon + uppercase word, colour keyed to health.
- `RagDisc` — a 10px inset-ring disc; always beside a word.

### Cards / containers (`Card` → PrimeReact `Card`)
- `panel` background, 1px `rule` border, **8px** radius, **no shadow**, `20px` body padding
  (the wrapper strips any legacy `p-*` utility so padding never doubles).
- `EmptyState` — solid (not dashed) `rule` border, centred `ink-subtle` icon, 16px/600
  title, one `InkLink` CTA.

### Inputs / fields (`form.tsx` → PrimeReact `InputText` / `InputTextarea` / `Dropdown` /
`Calendar` / `AutoComplete` / `RadioButton` / `Checkbox`)
- **Resting:** filled `input-bg`, 1px `input-border`, 3px radius, 16px text, `8px 10px`
  pad, `min-height 40px`.
- **Hover:** `input-bg-hover` + `input-border-hover`.
- **Focus:** `input-bg-focus` (white / dark `#1D2125`), border → `link`, `0 0 0 1px link`
  ring, no outline.
- **Disabled:** `opacity .55`, `not-allowed`.
- **Error:** `.eos-field-error` wrapper (or `.p-invalid`) → `rag-bad-fill` border; the
  `Field` renders a `rag-bad` message with an `exclamation-circle` glyph under the control.
- **`Field`:** sentence-case `field-label` caption; `required` → red `*`; `optional` →
  muted `(optional)`; `hint` or `error` below in `small`; `width` (`xs` 7rem / `sm` 12rem /
  `md` 20rem / `lg` 28rem / `full`) constrains the field to its content length.
- **`RadioCards`:** full-width tappable rows with a real PrimeReact `RadioButton`; checked
  → `link` border + `link-subtle-bg` fill (6px radius).
- **`FileInput`:** a native `<input type=file>` (server actions read it from `FormData`);
  the `::file-selector-button` is themed to the default button.
- **`SearchInput`:** `IconField` + leading `pi-search`.

### DataTable (PrimeReact `DataTable` — the primary data surface)
- Wrapper: 1px `rule`, 8px radius, `overflow: hidden`; the body scrolls horizontally
  inside on narrow screens.
- Header cells: `small` (12px) / 600 `ink-muted`, **sentence case**, no tracking,
  `10px 12px`, `rule` bottom hairline.
- Body cells: 14px, `9px 12px`, `rule` bottom hairline only (last row none). Row hover
  `hover`.
- **Clickable rows:** list tables (`ProjectsTable`, `MilestonesTable`,
  `ProjectPerformanceTable`, `AdminProjectsTable`) add `eos-rows-clickable` +
  `onRowClick` → `router.push`; the inner `<Link>` stays for a11y and middle-click, text
  selection suppresses the navigation.
- Row-expansion (`DashboardLedger`, `ProjectMilestoneTable`): panel on `paper`, no cell
  padding, opens with the 120ms `ledger-reveal`.
- Sort glyph `ink-subtle` → `link` when active; the row toggler is a 24px `subtle-btn`
  hover target. No paginator — lists show in full.

### Field icon chips (`FieldIcon` / `InfoField` / `StatRow`)
A small **8px-radius** square, categorical (never status) icon tag beside a label/value
pair — the one deliberate exception to the One-Accent Rule, scoped to dense overview
panels (Project detail, Milestone detail, the public project preview). Two sizes: `md`
(2rem, the default, for a field grid) and `sm` (1.75rem, for a stacked stat rail).

A fixed **tone → meaning** table — extend it rather than inventing a new tone per field:
- **blue** — organisation / contact identity (client, delivered-by, client email) and a
  "reviewed" count.
- **indigo** — classification (services, project type).
- **green** — a start-of-range date, or a count of things that exist (milestones).
- **amber** — a rating or star-adjacent metric.
- **orange** — a due / deadline date — distinct from `amber` so "a date" and "a score"
  never share a colour.
- **purple** — people (team size, client contacts, assignees, the People avatar stack) and
  an in-progress state.
- **teal** — a rate or percentage (response rate, budget).
- **rose** — a tag/classification field (engagement model) and client health.
- **slate** — anything with no strong category (bookkeeping dates like "Created", a
  secondary rating).

`InfoField` composes a chip with a stacked `field-label` caption + value, replacing a bare
`<dt>/<dd>` pair. `StatRow` composes a chip with the label on the left and a right-aligned
`tabular-nums` value, for a Performance-style rail. Both sit inside a `Card` — the panel
itself keeps the normal 1px `rule` + 8px radius + no shadow, only the chips carry colour.

### Score meter (`StarRating` — deliberately not stars)
A numeric value (14px / 500, or 24px for `size="lg"`) + a thin 34×4px (56×6px large) pill
track with a proportional fill coloured by band (`≥4` `rag-good-fill`, `≥3`
`rag-warn-fill`, else `rag-bad-fill`). Null renders "Not rated". Display only — the
client's rating *entry* is `MilestoneReviewForm`'s option rows.

### Navigation (`NavLinks` → PrimeReact `Menu`; `Breadcrumbs`)
Vertical list; each item 3px radius, `7px 10px`, 14px / 500, `ink-muted` with an
`ink-subtle` glyph. Hover → `subtle-btn` + `ink`. Active (`aria-current="page"`) →
`link-subtle-bg` fill, `link-strong` text and glyph, 600. `Breadcrumbs` in the header is
`{company}` (plain) `/` `{section}` (links to its list unless already there), `ink-subtle`
slash.

### Overlays (`Dialog`, `OverlayPanel`, `Sidebar`, `Menu`, dropdown / autocomplete /
calendar panels)
`raised` background, 1px `rule`, 6–8px radius, `elevation.overlay`. `Dialog` header is
16px / 600 sentence case over a `rule` divider. Mask `rgba(9,30,66,.54)` / dark
`rgba(0,0,0,.6)`.

### Toast — Jira-style flag (`ToastHost` in `Providers`, fired via `toastSuccess` /
`toastError` / `notify`)
Bottom-left, `raised` + 1px `rule` + `elevation.overlay`, 6px radius. Summary 14px / 600
`ink`; detail 12px `ink-muted`. Success / error / info / warn icon in the matching RAG
fill or `link`. Every same-page mutation (`ActionForm`, `MoreActions`) raises one on
success and a generic one on failure.

### Overflow menu (`MoreActions`)
A `…` (`pi-ellipsis-h`) default icon-button opens a popup `Menu` (6px, `elevation.overlay`,
14rem min-width, 3px item radius, `hover` item fill, `rag-bad` for `danger` items). Keeps
an action bar to its two or three primary buttons plus this.

### Charts (`TrendChart` → PrimeReact `Chart`; `Sparkline`)
`Chart type="line"`: a 1.75px `ink` line, square markers, `rule` gridlines, `ink-muted`
11px tabular axis labels, no legend. `Sparkline` is inline SVG in `currentColor`, an
em-dash when empty.

## Do's and Don'ts

### Do
- Build a surface as `panel` + 1px `rule` + 8px radius on the `paper` page.
- Put the one primary action per view in a navy `Button`; make everything else the
  `subtle-btn` default or a text button.
- Give every floating surface `elevation.overlay` + a 1px `rule` — dropdowns, dialogs,
  toasts, the drawer.
- Render a form control as a filled `input-bg` box with a visible 1px `input-border` and a
  40px min height; label it in sentence case.
- Set section headings in 14px semibold sentence case with nothing beneath them.
- Set every figure, id, date and table numeral with `tabular-nums` in the system face.
- Show status as a soft-tint lozenge or a `RagDisc` + word; keep navy for actions and
  links only.
- Confirm every same-page mutation with a `toastSuccess`; surface failures with
  `toastError`.
- Make list rows clickable (`eos-rows-clickable` + `onRowClick`) with the inner link kept.
- Keep 3px on controls, 6px on overlays, 8px on cards.

### Don't
- Reintroduce the warm "paper / ink" palette, a webfont, a monospace face, 2px corners,
  or a hairline `gap-px` grid — that was the discarded prototype world.
- Draw a borderless input, an ALL-CAPS field label or section heading, or a tracked
  small-caps table header.
- Put a `box-shadow` on a card, or a 2px border on a dropdown.
- Render stars for a rating — use the numeric value + meter.
- Colour a heading, link or non-concerning figure with a RAG hue, or tint a surface navy
  beyond `link-subtle-bg`.
- Crowd an action bar past ~3 buttons — move the rest into `MoreActions`.

## Coverage

The system covers the whole product: the `(app)` route group and its forms, the shared
shell (`NavShell` / `NavLinks` / `AppChrome` / `Breadcrumbs`), the auth cover
(`AuthShell`, `/login`, `/invite/[code]`), the admin area, the client review flow
(`MilestoneReviewForm`), every `src/components/*` widget, and the token + skin layer in
`src/app/globals.css`. Public Sans, Roboto Mono and Material Symbols are removed;
PrimeReact + PrimeIcons + a system font stack are the whole vocabulary.
