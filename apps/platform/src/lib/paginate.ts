/*
 *   One page of a list that's shown a few rows at a time (payment history,
 *   add-ons). A page past the end (e.g. after a filter or a delete shrinks
 *   the list) is moved back to the last page.
 **/
export function paginate<T>(
  items: T[],
  page: number,
  perPage: number,
): { items: T[]; page: number; pageCount: number; start: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * perPage;

  return {
    items: items.slice(start, start + perPage),
    page: currentPage,
    pageCount,
    // Index of the first item on this page, in the full list.
    start,
  };
}

// The page (from 1) that the item at `index` is on.
export function pageOf(index: number, perPage: number): number {
  return Math.floor(Math.max(0, index) / perPage) + 1;
}
