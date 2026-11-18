// Each category gets one of eight tile colours (tokens --tile-1 .. --tile-8),
// by its place in the category list, so it keeps the same colour everywhere.
export function categoryTone(categoryId, categories) {
  if (!categoryId) return 8;
  const index = categories.findIndex((c) => c._id === categoryId);
  return index < 0 ? 8 : (index % 7) + 1;
}

// The style that sets a tile's colours from its tone.
export function toneStyle(tone) {
  return { '--tone': `var(--tile-${tone})`, '--tone-text': `var(--tile-${tone}-text)` };
}
