# HordeDesk: design

## Who it is for

Any small shop: a supermarket, pharmacy, boutique or beauty shop. Cashiers use the till all
day on a Windows laptop or a touch screen, next to a barcode scanner. Owners and managers
use the back office: stock, suppliers, purchase orders, reports, staff and settings. Many
users are new to computers, so the app has to be obvious without being explained.

## Principles

- **Screens explain themselves.** No page introductions, no "this page is for..." lines, no
  help paragraphs under fields. Labels, buttons and headings say what things are. Help text
  is only for what cannot be seen (for example a warning that profit is overstated).
- **Icons with words.** Navigation and till actions have a [lucide](https://lucide.dev)
  icon and a word. Icons alone only where the meaning is universal (remove, edit, close),
  and they always carry an accessible name. **No emoji anywhere.**
- **One loud thing per screen.** On the till it is the total and the green **Complete sale**.
  Elsewhere it is the page's one blue main button.
- **Pictures are optional.** A product without a picture shows its initials on its
  category's colour, so the tiles never look empty.
- **The shop's own brand.** The shop's logo (if it adds one) appears in the sidebar, on the
  sign-in screen and on receipts. HordeDesk's own mark is used only where there is no logo.

## Layout

- **App shell:** a dark sidebar on the left on every signed-in screen, grouped *(Sell,
  Today)*, *Sales*, *Stock*, *Shop*, with the shop's logo and name at the top and the person
  signed in at the bottom. **Hide names** turns it into an icon rail (names become tooltips).
  On a phone it becomes a top bar with a menu button that slides the sidebar in.
- **Back-office pages:** a title with the page's main action on the right, then white
  panels on a light grey floor. Tables run edge to edge in their panels.
- **The till** fills the screen:
  - **Left (420px):** held bills as tabs, the scan-or-type box with the scanner status, the
    bill lines, six action buttons (Find, Discount, Hold, Recall, Return, Cancel, each with
    its function key), the sums, the large total and **Complete sale**.
  - **Right:** category buttons (each with its colour dot) and the product tiles: picture or
    initials, name (two lines), price, and stock (amber when low, red "Out").
  - Under 760px wide the bill sits above the tiles.

## Colour

Tokens are in `client/src/styles/tokens.css` (primitive → semantic → component).

| Role | Value | Used for |
|------|-------|----------|
| Ink | `#111827` | Sidebar, text, selected category, the dark toast |
| Blue | `#3346D3` | Main buttons, links, current page, focus outline, selected tab |
| Blue tints | `#EEF1FE`, `#DDE3FD` | Just-added bill line, selected rows, button hover |
| Green | `#15703C` | **Complete sale** only, and success messages |
| Floor | `#F2F4F7` | Behind panels |
| Paper | `#FFFFFF` | Panels, tables, dialogs, tiles |
| Muted text | `#545E6E` | Secondary text, table headings |
| Lines | `#E4E7EC`, `#CFD4DC` | Rules, control borders |
| Warning | `#7A4B00` on `#FFF2CC` | Low stock, unsaved changes, missing cost prices |
| Danger | `#B42318` on `#FCE8E6` | Errors, delete, out of stock |

**Category colours** (`--tile-1` to `--tile-8`): eight soft fills with dark text, each at
least 8:1. A category gets one by its position in the category list, so it keeps the same
colour on every tile and button.

Contrast: text on paper 17.7:1; muted text 6.6:1 on paper, 5.9:1 on the floor; blue and
white 7.1:1 either way; white on green 6.1:1; sidebar text 14.7:1 and muted sidebar text
7.8:1 on ink; category tiles 8.4:1 or better.

## Type

One family, **Plus Jakarta Sans** (bundled, because shops are often offline), with tabular
figures so money lines up. Sizes: 13 (small), 15 (tables), 16 (body), 18 (headings),
24 (page titles), 30 (figures), 44 to 56 (the till total, which shrinks to always fit on
one line).

## Components

- **Buttons:** 44px high (36px small, 52 to 64px on the till). Primary = blue fill;
  default = white with a light border; danger = red text; quiet = blue text only.
- **Icon buttons** in tables: 36px, grey, blue (or red for delete) on hover, with an
  accessible label and a tooltip.
- **Fields:** label above, 44px high, light border, blue focus ring.
- **Notices:** a 4px coloured edge on a tint. **Toasts** appear top right.
- **Dialogs:** title, Close (Esc), body, buttons on the right of the footer.
- **Status words** (In stock, Low, Out of stock, Ordered, Part received, Received,
  Cancelled) are coloured text, never colour alone.

## Receipts

Monospace, black on white, 58mm, 80mm or A4. The shop's logo prints at the top in greyscale
when the shop has one and "Print the logo on receipts" is on.

## The website

`site/` uses the same tokens and type: a white header with the mark, a hero with the till
screenshot and two buttons (**Try it in your browser**, **Download for Windows**), six
feature cards with icons, four screenshots, and a dark download band with the steps and
what the laptop needs. Phone width: one column, 16px side margins, no sideways scrolling.
