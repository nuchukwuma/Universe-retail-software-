# Universe POS: design direction

## The brand

**Universe Cosmetics & Beauty Skincare** sells skincare, make-up, hair care and
fragrance. Its logo is a bright aqua star wrapped in a planet's ring, on true black,
with the shop's name set around it in a sturdy slab-serif. Two colours and one kind
of letter: that is the whole identity, and this design uses exactly those.

| Brand element | From the logo | In the app |
|---------------|---------------|------------|
| Night | the black of the badge, `#000000` | the top bar, the till's counter, the sign-in side, the current page |
| Universe aqua | the star and lettering, `#30E0E0` | only ever on Night: the shop name, the total, Complete sale |
| Slab-serif lettering | the name around the badge | **Bitter**: the shop name, page titles, headings, the total and big figures |

The logo picture itself is not shown in the app (no pictures on screen).

## Who it is for

Cashiers and stock staff at the shop counter, all day, on a Windows laptop or a tablet
next to a barcode scanner. Their job: scan, see the total, take the money, next
customer. Their second job: add new stock as it arrives, find a product, count stock,
fix a price. The owner and managers use the back office: today's takings, reports,
stock, staff and settings.

## Direction: the night counter

The shop's sign is night sky and aqua light. The app is built like the shop counter
under that sign: **light where people read and type** (the bill, tables, forms), and
**night where the money is** (the counter column of the till with the total). The aqua
light is used sparingly, like the logo's: it marks the one thing that matters on the
screen.

- **One loud thing:** the bill total, aqua Bitter figures on the black counter, readable
  from the customer's side. Complete sale is the only aqua button.
- **Everything else is quiet:** white panels on a pale mist floor, black text, deep
  aqua for links and the current choice.
- **No icons, emoji, pictures, logos, gradients or shadows.** Hierarchy comes from the two
  typefaces, weight, size, colour and space. Every button says what it does in words.

## Colour

Six base colours, plus three status colours. No gradients.

| Name | Hex | Used for |
|------|-----|----------|
| Night | `#000000` | Top bar, the till counter, sign-in side, current page, main buttons, text |
| Universe aqua | `#30E0E0` | On Night only: shop name, the total, Complete sale, focus on Night |
| Deep aqua | `#00676D` | Aqua that works on white: links, selected tabs and choices, focus |
| Aqua glow | `#BFF4F4` | The just-scanned line and selected rows (always with Night text) |
| Paper | `#FFFFFF` | Working surfaces: the bill, tables, forms, dialogs |
| Mist | `#EEF3F3` | The floor between panels |
| Graphite | `#4F5B5C` | Muted text: help, captions, secondary columns |
| Success | `#17733A` on `#E2F3E7` | Sale complete, stock saved, scanner ready |
| Warning | `#7A4B00` on `#FFF0C7` | Low stock, backup overdue |
| Danger | `#B3261E` on `#FCE7E5` | Errors, product not found, delete, out of stock |

Contrast (WCAG): Night on Paper 21:1, on Mist 18.7:1. Aqua on Night 12.9:1. Deep aqua on
Paper 6.6:1, on Mist 5.9:1. Graphite on Paper 7:1. Night on Aqua glow 17.5:1. On the
counter: white 21:1, muted counter text (`#9BA7A7`) 8.5:1, the red Cancel text
(`#FF8A80`) 9.2:1. Each status colour on its own tint at least 5.1:1.

**Aqua never sits on white.** It is too pale there (1.6:1); on white the app uses Deep
aqua instead.

## Typography

Two families, both bundled with the app because the shop laptop is offline
(`@fontsource-variable`, imported in `main.jsx`):

- **Bitter** (slab-serif, variable weight): the closest match to the logo's lettering,
  drawn for screens, with level (lining) figures and the Naira sign.
- **Plus Jakarta Sans** (text): everything people read in quantity. Clear at 14-17px, with
  tabular figures so prices line up in columns. It is clearly different from the slab,
  so the two never compete.

| Role | Family | Weight | Size |
|------|--------|--------|------|
| Bill total | Bitter | 700 | up to 80px desktop, 56px tablet |
| Big figures (Today, End of day) | Bitter | 700 | 26-40px |
| Page title | Bitter | 600 | 36px |
| Shop name (top bar) | Bitter | 700 | 22px, aqua on Night |
| Section and dialog heading | Bitter | 600 | 21px |
| Body, form labels, buttons | Plus Jakarta Sans | 400 / 600 | 17px |
| Tables, navigation | Plus Jakarta Sans | 400 / 600 | 16px |
| Small print (help text) | Plus Jakarta Sans | 400 | 14px |

- Tables and amounts in sentences use **tabular numerals** (Plus Jakarta Sans), so prices
  line up. Bitter is only used for single big numbers, where alignment does not matter.
- Sentence case everywhere. No all-caps labels, no tracked-out eyebrows.
- Body line length stays under about 75 characters.
- Scale: 14 / 16 / 17 / 21 / 22 / 26 / 36 / 56 / 80.

## Space and shape

- **Spacing scale (4px base):** 2, 4, 8, 12, 16, 24, 32, 48, 64.
- **Panels** are white areas on the Mist floor, no borders and no shadows, with 10px
  corners: soft like the round jars and bottles on the shelf, but not pills.
- **Controls** (buttons, inputs) have 8px corners; choice buttons (Today / This week)
  are fully round, because they are the only on/off chips. Shape tells you what kind of
  thing it is.
- **Rules:** a 2px Night rule under table headers; 1px Mist-grey rules between rows.
- **Dialogs** sit on a dark see-through backdrop, white with 12px corners and a Night
  header line.
- **Density:** table rows are 44px high (comfortable for a finger), till buttons 56px,
  inputs 44px. Nothing touchable is smaller than 44 x 44px.

## Layout

### Sales screen (the till)

```
+------------------------------------------------------------------------------+
| Universe Cosmetics & Beauty Skincare   Sell  My sales        Amaka   Log out | Night bar,
+---------------------------------------------------+--------------------------+ aqua name
| Scan or type a barcode [_____________________][Add]| Total                    |
| Scanner ready                                     | N30,225                  | aqua figures
+---------------------------------------------------+ Items 6                  |
| Item                      Qty              Amount | Before discount N30,500  |
| Nivea Soft Cream 200ml    - 2 +           N9,000  | [  Complete sale   F10 ] | aqua button
| CeraVe Cleanser (just scanned, aqua glow) N21,225 |--------------------------|
| ...                                               | Find product        F2   |
|        (white bill on the Mist floor)             | Discount F8   Hold F6    | outlined
|                                                   | Recall F7     Return     | on Night
|                                                   | Cancel bill         F9   |
+---------------------------------------------------+--------------------------+
```

- The Night top bar and the Night counter column join into one black frame around the
  white bill: the counter under the shop's sign.
- The scan box is always focused. The scanner works the moment a page loads, after
  every sale, after any dialog closes, and after a click anywhere that is not
  another input.
- Keyboard first: F2 find, F6 hold, F7 recall, F8 discount, F9 cancel,
  F10 complete sale, F1 shortcut list. Every shortcut is printed on its button.
- Tablet (under 900px wide): the counter's total and Complete sale sit at the top, the
  bill below, the other actions after it, still on Night.

### Back office

```
+------------------------------------------------------------------------------+
| Universe Cosmetics & Beauty Skincare   Sell  Back office     Ngozi   Log out |
+----------------+-------------------------------------------------------------+
| [ Today      ] | Today                                         [All reports] |
|                | How the shop is doing on 29 Oct 2026.                       |
| Selling        |                                                             |
|   Sales history| Takings today   Sales today   This week     This month      |
|   End of day   | N168,400        12            N1,098,300    N2,582,050      |
|   Reports      |                                                             |
| Stock          | +-----------------------+  +-----------------------------+  |
|   Add stock    | | Running low           |  | Best sellers today          |  |
|   ...          | +-----------------------+  +-----------------------------+  |
+----------------+-------------------------------------------------------------+
```

A Night top bar, then a white page list on the left: **Today** on its own, then three
groups, each under a small heading:

- **Selling:** Sales history, End of day, Reports
- **Stock:** Add stock, Products, Stock count, Categories
- **Shop:** Staff, Settings, Backup and restore

Within a group, the page used most comes first. Each person only sees the pages their
role allows (a cashier sees Sales history and End of day). The current page is a Night
bar with aqua text: the brand pair again, meaning "you are here". Each page has a Bitter
title, one short line saying what the page is for, and its main action on the right.
Content is left-aligned tables and forms.

Below 900px the page list becomes a horizontal scrolling row under the top bar.

### Sign in

Night on the left with the shop name in large aqua Bitter and one line ("Sign in to start
selling"); a white form on the right. On narrow screens the Night part sits on top.

## Review against generic defaults

The plan was checked against the looks that turn up whatever the subject:

- **"Near-black with one bright accent"** is a common default, but here it is the shop's
  actual logo, so it stays. It is confined to brand moments (the bar, the counter, sign
  in, the current page); the working surfaces stay light, because staff read tables and
  type into forms all day.
- **The previous direction** (teal "supermarket shelf signage", a high-contrast display
  serif) came from the first brief, which described a supermarket. It did not fit a
  skincare shop and its serif was a stock "elegant" choice. Replaced by the logo's own
  colours and a slab that matches its lettering.
- **The card kit** (identical rounded cards, one radius everywhere, soft shadows): avoided.
  No shadows; radius differs by kind (panels 10px, controls 8px, chips round, receipts
  square).
- **Template chrome** (all-caps eyebrows, middle-dot meta strings, arrows on buttons,
  monospace labels): none. The receipt's capitals and monospace are the thermal-receipt
  convention, not decoration.
- **Sample data** was supermarket food (rice, Milo, Coca-Cola). It is now skincare and
  beauty products, so the screens show what the shop really sells.

## Printing

The only thing the app prints is the customer's receipt (and the return slip, which is
the customer's refund receipt). Receipts carry no staff or customer names. They stay
black on white, monospaced, for thermal paper. Reports and End of day are screen-only
(reports can still be exported to Excel).

## Writing

- Buttons say exactly what happens: "Complete sale", "Add to bill", "Save product",
  "Remove". The toast after an action uses the same word ("Sale completed").
- Errors say what happened and what to do: "No product has the barcode 615000999.
  Check the number, or add it as a new product."
- Empty states invite the next action: "No products yet. Add your first product."
- Loading states are plain text: "Loading products..."

## Tokens

All of the above lives in `client/src/styles/tokens.css` as CSS variables, in three
layers:

1. **Primitive:** raw values (`--night`, `--aqua-400`, `--space-4`, `--font-size-5`).
2. **Semantic:** what a value means (`--color-text`, `--color-surface`,
   `--color-action`, `--color-counter`, `--color-danger-text`).
3. **Component:** per-component settings (`--control-height`, `--table-row-height`,
   `--ticket-font-size`, `--corner-panel`).

Screens use only semantic and component tokens, never raw hex values. Control sizes are
component tokens too. The only plain pixel values left in the styles are screen-width
breakpoints (CSS cannot use variables there) and the receipt's text sizes, which are
fixed for the thermal printer.

### Button states

| Button | Normal | Hover | Pressed | Disabled |
|--------|--------|-------|---------|----------|
| Plain | white, Night border | Mist | darker Mist | Mist, muted text |
| Main | Night, white text | Deep aqua | darkest aqua | Mist, muted text |
| Danger | red text and border | pale red | pale red, darkest red text | Mist, muted text |
| Quiet (underlined, in tables) | Deep aqua or red text | pale aqua or pale red | darker text | muted text |
| Complete sale | aqua, Night text | white | darker aqua | outlined, faint |
| Counter actions | outlined on Night, white text | aqua border | darker Night | faint |

Every button also shows the focus outline when reached with the keyboard: Night on light
surfaces, aqua on Night.

## Rules that keep it working

- **The total never wraps.** It is sized from the counter's width and the number of
  characters (container units, `--chars` in `PriceTicket.jsx`), up to 80px.
- **Big figures shrink on tablets** (`clamp()` on `.figure dd`), so long Naira amounts fit.
- **No browser-drawn symbols:** the clear "x" in search boxes, the spinner arrows in number
  boxes and the calendar symbol in date boxes are hidden. Date boxes open their calendar
  when clicked (`DateInput.jsx`).
- **Scans never press buttons in dialogs.** On the till, a scan that arrives while a window
  is open is stopped and a message says to close the window first.

## Deliberate exceptions to "no images, no icons"

- **Barcode stripes** at the bottom of receipts. They are machine-readable data for the
  scanner (returns are found by scanning the receipt), not decoration.
- **The Windows program icon** (taskbar, desktop shortcut, installer). It is part of
  Windows, not of the app's screens.
- **The small arrow inside drop-down lists** (`<select>`). It is drawn by the browser and
  is the only sign that the box opens a list.
