// Rows after this many come in together, so long lists don't take ages to appear.
const MAX_STAGGERED_ROWS = 8;

/*
 *   Props for one row of a list or table (motion.li / motion.tr).
 *
 *   - When the list first shows, rows fade and rise in one after another.
 *   - `layout` makes a row slide to its new spot when the list is reordered,
 *     instead of jumping.
 *
 *   Usage: <motion.li key={item.id} {...listRowMotion(index)}>
 **/
export function listRowMotion(index: number) {
  return {
    layout: "position" as const,
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.2,
      ease: "easeOut" as const,
      delay: Math.min(index, MAX_STAGGERED_ROWS) * 0.04,
      layout: { duration: 0.25, ease: "easeInOut" as const },
    },
  };
}

/*
 *   Props for a dashboard card (motion.section). Cards fade and rise in one
 *   after another, a little slower than list rows since there are only a few.
 *
 *   Usage: <motion.section {...cardMotion(0)}>
 **/
export function cardMotion(index: number) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.25,
      ease: "easeOut" as const,
      delay: Math.min(index, MAX_STAGGERED_ROWS) * 0.08,
    },
  };
}

// Fades a whole section in once its data has loaded.
export const fadeInMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2, ease: "easeOut" },
} as const;
