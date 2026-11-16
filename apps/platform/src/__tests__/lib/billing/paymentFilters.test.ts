import {
  daysInMonth,
  filterPayments,
  paginate,
  paymentYears,
  recentRangeStart,
} from "@/lib/billing/paymentFilters";

// Local dates, the same way the page reads them.
function at(year: number, month: number, day: number, hour = 12) {
  return new Date(year, month, day, hour).toISOString();
}

const now = new Date(2026, 10, 14, 12); // Nov 14, 2026, noon

const payments = [
  { id: "today", paidAt: at(2026, 10, 14, 9) },
  { id: "5-days", paidAt: at(2026, 10, 9) },
  { id: "10-days", paidAt: at(2026, 10, 4) },
  { id: "oct-20", paidAt: at(2026, 9, 20) },
  { id: "oct-10", paidAt: at(2026, 9, 10) },
  { id: "dec-2025", paidAt: at(2025, 11, 1) },
  { id: "nov-2025", paidAt: at(2025, 10, 1) },
];

const ids = (list: { id: string }[]) => list.map((payment) => payment.id);

describe("recentRangeStart", () => {
  it("goes back 7 days for a week", () => {
    expect(recentRangeStart("week", now)).toEqual(new Date(2026, 10, 7, 12));
  });

  it("goes back to the same date last month and last year", () => {
    expect(recentRangeStart("month", now)).toEqual(new Date(2026, 9, 14, 12));
    expect(recentRangeStart("year", now)).toEqual(new Date(2025, 10, 14, 12));
  });

  it("uses the last day of the month when the date doesn't exist", () => {
    expect(recentRangeStart("month", new Date(2026, 2, 31))).toEqual(
      new Date(2026, 1, 28),
    );
    expect(recentRangeStart("year", new Date(2028, 1, 29))).toEqual(
      new Date(2027, 1, 28),
    );
  });

  it("goes back to December of the year before in January", () => {
    expect(recentRangeStart("month", new Date(2026, 0, 15))).toEqual(
      new Date(2025, 11, 15),
    );
  });
});

describe("filterPayments", () => {
  it("keeps everything for all time", () => {
    expect(filterPayments(payments, { kind: "all" }, now)).toHaveLength(7);
  });

  it.each([
    ["week", ["today", "5-days"]],
    ["month", ["today", "5-days", "10-days", "oct-20"]],
    ["year", ["today", "5-days", "10-days", "oct-20", "oct-10", "dec-2025"]],
  ] as const)("filters the last %s", (range, expected) => {
    expect(ids(filterPayments(payments, { kind: "recent", range }, now))).toEqual(
      expected,
    );
  });

  it("filters by year, year and month, and an exact day", () => {
    expect(
      ids(filterPayments(payments, { kind: "date", year: 2025, month: null, day: null }, now)),
    ).toEqual(["dec-2025", "nov-2025"]);

    expect(
      ids(filterPayments(payments, { kind: "date", year: 2026, month: 9, day: null }, now)),
    ).toEqual(["oct-20", "oct-10"]);

    expect(
      ids(filterPayments(payments, { kind: "date", year: 2026, month: 9, day: 20 }, now)),
    ).toEqual(["oct-20"]);
  });
});

describe("paymentYears", () => {
  it("lists each year once, newest first", () => {
    expect(paymentYears(payments)).toEqual([2026, 2025]);
  });
});

describe("daysInMonth", () => {
  it("knows leap years", () => {
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2026, 9)).toBe(31);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 23 }, (_, index) => index);

  it("returns 10 per page", () => {
    expect(paginate(items, 1)).toEqual({
      items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      page: 1,
      pageCount: 3,
      start: 0,
    });
    expect(paginate(items, 3).items).toEqual([20, 21, 22]);
  });

  it("moves a page past the end back to the last page", () => {
    expect(paginate(items, 9).page).toBe(3);
    expect(paginate([], 4)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      start: 0,
    });
  });
});
