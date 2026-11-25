// Keep the reference's bottom-left control clear of the retained A24 dock,
// including the reference link's 1.5rem expanded touch target.
export function mobileViewsBottom(viewportHeight, root, control, dock) {
  const hitPadding = 1.5 * root;
  const overlaps = control.left - hitPadding < dock.right && control.right + hitPadding > dock.left;
  return overlaps ? Math.max(2.5 * root, viewportHeight - dock.top + hitPadding + 8) : 2.5 * root;
}

export function outsideProfileDisc(x, y, width, height, root) {
  return Math.hypot(x - width / 2, y - height / 2) > 21 * root;
}
