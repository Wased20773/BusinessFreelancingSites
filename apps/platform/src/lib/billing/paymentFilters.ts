/*
 *   Filtering and pages for Settings → Billing's payment history. Every payment
 *   comes back in one request, so this all runs in the browser.
 *
 *   Dates use the viewer's local time, the same as the dates shown in the table.
 **/

import { paginate as paginateList } from "@/lib/paginate";

export const PAYMENTS_PER_PAGE = 10;

export type RecentRange = "week" | "month" | "year";

// One filter at a time: everything, a recent range, or a calendar date.
export type PaymentFilter =
  | { kind: "all" }
  | { kind: "recent"; range: RecentRange }
  // month is 0–11 (January = 0); day is 1–31. null means "any".
  | { kind: "date"; year: number; month: number | null; day: number | null };

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/*
 *   When a recent range starts. "Last month" on Nov 14 starts Oct 14, and "last
 *   year" starts the same date a year ago. When that date doesn't exist (Mar 31
 *   minus a month), it uses the last day of that month (Feb 28/29).
 **/
export function recentRangeStart(range: RecentRange, now: Date): Date {
  if (range === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  }

  const year = range === "year" ? now.getFullYear() - 1 : now.getFullYear();
  const month = range === "month" ? now.getMonth() - 1 : now.getMonth();

  // new Date() handles month -1 (December of the year before).
  const firstOfMonth = new Date(year, month, 1);
  const day = Math.min(
    now.getDate(),
    daysInMonth(firstOfMonth.getFullYear(), firstOfMonth.getMonth()),
  );

  return new Date(
    firstOfMonth.getFullYear(),
    firstOfMonth.getMonth(),
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
}

export function matchesFilter(
  paidAt: string,
  filter: PaymentFilter,
  now: Date,
): boolean {
  const date = new Date(paidAt);

  switch (filter.kind) {
    case "all":
      return true;
    case "recent":
      return date >= recentRangeStart(filter.range, now) && date <= now;
    case "date":
      return (
        date.getFullYear() === filter.year &&
        (filter.month === null || date.getMonth() === filter.month) &&
        (filter.day === null || date.getDate() === filter.day)
      );
  }
}

export function filterPayments<T extends { paidAt: string }>(
  payments: T[],
  filter: PaymentFilter,
  now: Date = new Date(),
): T[] {
  return payments.filter((payment) =>
    matchesFilter(payment.paidAt, filter, now),
  );
}

// The years that have payments, newest first, for the Year dropdown.
export function paymentYears(payments: { paidAt: string }[]): number[] {
  return [
    ...new Set(payments.map((payment) => new Date(payment.paidAt).getFullYear())),
  ].sort((a, b) => b - a);
}

// One page of payments (see lib/paginate.ts).
export function paginate<T>(
  items: T[],
  page: number,
  perPage: number = PAYMENTS_PER_PAGE,
) {
  return paginateList(items, page, perPage);
}
