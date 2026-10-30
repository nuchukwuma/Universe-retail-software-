# Universe POS: design direction

## Who it is for

Cashiers and stock staff at a busy Nigerian supermarket counter, all day, on a Windows
laptop or a tablet next to a barcode scanner. Their job: scan, see the total, take the
money, next customer. Their second job: find a product, count stock, fix a price.

## Direction: shelf signage

A supermarket already has a visual language that everyone in the shop reads without
thinking: **aisle signs and shelf-edge price tickets**. Solid colour panels, big
numerals for the price, plain text for everything else. The app borrows that
language and nothing else.

- **Mood:** calm, dense, high-contrast, utilitarian. Nothing moves unless the user did
  something. Nothing is there to decorate.
- **One loud thing:** the bill total. It is set like a shelf price ticket: a solid teal
  panel with large serif figures that can be read from the customer's side of the
  counter. Every other part of the screen stays quiet so the total wins.
- **One functional highlight:** the line that was just scanned gets a yellow
  "sticker" background, like a promotion ticket, so the cashier sees at a glance
  what the scanner added.
- **No icons, emoji, pictures, logos, gradients or shadows.** Hierarchy comes from typeface,
  weight, size, colour and rules (lines) only. Every button says what it does in words.

## Typography

Two families, both bundled with the app because the shop laptop is offline
(`@fontsource-variable`, imported in `main.jsx`):

- **Cormorant Garamond** (display serif): the shop name, page titles, the bill total and
  the big figures. Its high-contrast, beauty-counter feel suits a cosmetics and skincare
  shop, and it is only used large, where it reads well.
- **Plus Jakarta Sans** (text): everything else. Clear at 14-17px on a laptop screen,
  with an open, friendly shape that sits well next to the serif.

| Role | Family | Weight | Size |
|------|--------|--------|------|
| Bill total (price ticket) | Cormorant Garamond | 700 | up to 80px desktop, 56px tablet |
| Page title | Cormorant Garamond | 600 | 40px |
| Shop name (top bar) | Cormorant Garamond | 700 | 26px |
| Big figures (Today, End of day) | Cormorant Garamond | 700 | 26-40px |
| Section heading | Plus Jakarta Sans | 700 | 21px |
| Body, form labels, buttons | Plus Jakarta Sans | 400 / 600 | 17px |
| Tables, navigation | Plus Jakarta Sans | 400 / 600 | 16px |
| Small print (help text) | Plus Jakarta Sans | 400 | 14px |

- All figures use **tabular numerals**, so prices and quantities line up in columns.
  Cormorant figures also use **lining numerals** (`lining-nums`) so amounts sit on the
  line instead of dipping like old-style figures.
- Both families have the Naira sign (₦).
- Sentence case everywhere. No all-caps labels, no tracked-out eyebrows.
- Body line length stays under about 75 characters.
- Scale: 14 / 16 / 17 / 21 / 26 / 30 / 40 / 56 / 80 (roughly 1.25 steps, with a
  jump for the total).

## Colour

Five base colours, plus three status colours. No gradients.

| Name | Hex | Used for |
|------|-----|----------|
| Paper | `#FFFFFF` | Working surfaces: the bill, tables, forms |
| Floor | `#E3E8E7` | The background between panels (a cool shop-floor grey) |
| Ink | `#142322` | Text and strong rules (the near-black of the Universe logo) |
| Universe teal | `#00665E` | Signage: the total panel, the main action, the current page |
| Ticket yellow | `#FFE14A` | The just-scanned line, selected rows (always with Ink text) |
| Success | `#17733A` on `#E2F3E7` | Sale complete, stock saved, scanner ready |
| Warning | `#7A4B00` on `#FFF0C7` | Low stock, unsaved changes, backup overdue |
| Danger | `#B3261E` on `#FCE7E5` | Errors, product not found, delete, out of stock |

Contrast (WCAG): Ink on Paper 16.2:1, Ink on Floor 13.1:1, white on teal 6.9:1, Ink on
yellow 12.5:1, muted text (`#4A5A59`) at least 5.8:1, each status colour on its own tint at
least 5.1:1. Keyboard focus is a 3px Ink outline with a 2px gap, so it sits on the
background around a control and stays visible even next to teal.

## Space, rules and shape

- **Spacing scale (4px base):** 2, 4, 8, 12, 16, 24, 32, 48, 64.
- **Structure comes from rules, not boxes.** Panels are flat white areas on the floor
  colour, separated by the floor gutter. Inside a panel, a 2px Ink rule sits under a
  header and 1px grey rules separate table rows.
- **No shadows.** Dialogs sit on a dark see-through backdrop with a 2px Ink border.
- **Corners:** 4px on things you press or type in (buttons, inputs), square on panels
  and tables. Shape tells you what is interactive.
- **Density:** table rows are 44px high (comfortable for a finger), till buttons 56px,
  inputs 44px. Nothing touchable is smaller than 44 x 44px.

## Layout

### Sales screen (the till)

```
+------------------------------------------------------------------------------+
| Universe Cosmetics & Beauty Skincare     Sell  My sales  (or Back office)    |
|                                                   Amaka (cashier)   Log out  |
+---------------------------------------------------+--------------------------+
| Scan or type a barcode [_____________________]    | Total                    |
| Scanner ready                                     | N30,225                  |  <- teal price ticket
+---------------------------------------------------+ 6 items                  |
| Item                      Qty        Price  Amount|                          |
| Royal Stallion Rice 5kg   - 2 +     12,500  25,000| [ Complete sale  F10 ]   |
| Milo 500g  (just scanned) - 1 +      5,500   5,225| Find product       F2    |
| ...                                               | Discount F8   Hold F6    |
|                                                   | Recall F7     Return     |
|                                                   | Cancel bill        F9    |
+---------------------------------------------------+--------------------------+
```

- The scan box is always focused. The scanner works the moment a page loads, after
  every sale, after any dialog closes, and after a click anywhere that is not
  another input.
- Left: the bill, newest scan highlighted. Right: the price ticket and the actions, in
  the order a cashier uses them. The main action is the only filled teal button.
- Keyboard first: F2 find, F6 hold, F7 recall, F8 discount, F9 cancel,
  F10 complete sale, F1 shortcut list. Every shortcut is printed on its button.
- Tablet (under 900px wide): the price ticket and Complete sale sit at the top, the bill
  below, the other actions in a two-column grid.

### Back office

A top bar (shop name, signed-in person, Log out) and a left list of pages:
**Today** on its own at the top, then three groups, each under a small heading and
separated by a line:

- **Selling:** Sales history, End of day, Reports
- **Stock:** Add stock, Products, Stock count, Categories
- **Shop:** Staff, Settings, Backup and restore

Within a group, the page used most comes first. Each person only sees the pages their
role allows (a cashier sees Sales history and End of day). The current page is a teal bar
with white text, like an aisle sign. Each page has a title, one short line saying what
the page is for, and its main action on the right. Content is tables and forms.

Below 900px the page list becomes a horizontal scrolling row under the top bar.

### Printing

The only thing the app prints is the customer's receipt (and the return slip, which is
the customer's refund receipt). Receipts carry no staff or customer names. Reports and
End of day are screen-only (reports can still be exported to Excel).

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

1. **Primitive:** raw values (`--teal-700`, `--space-4`, `--font-size-5`).
2. **Semantic:** what a value means (`--color-text`, `--color-surface`,
   `--color-action`, `--color-danger-text`).
3. **Component:** per-component settings (`--button-height`, `--table-row-height`,
   `--ticket-font-size`).

Screens use only semantic and component tokens, never raw hex values.

## Rules that keep it working

- **The total never wraps.** It is sized from the ticket's width and the number of
  characters (container units, `--chars` in `PriceTicket.jsx`), up to 80px.
- **Big figures shrink on tablets** (`clamp()` on `.figure dd`), so long Naira amounts fit.
- **No browser-drawn symbols:** the clear "x" in search boxes, the spinner arrows in number
  boxes and the calendar symbol in date boxes are hidden. Date boxes open their calendar
  when clicked (`DateInput.jsx`).
- **Scans never press buttons in dialogs.** On the till, a scan that arrives while a window
  is open is stopped and a message says to close the window first.

## Deliberate exceptions to "no images, no icons"

- **Barcode stripes** at the bottom of receipts. They are
  machine-readable data for the scanner (returns are found by scanning the receipt),
  not decoration.
- **The Windows program icon** (taskbar, desktop shortcut, installer). It is part of
  Windows, not of the app's screens.
- **The small arrow inside drop-down lists** (`<select>`). It is drawn by the browser and
  is the only sign that the box opens a list.
