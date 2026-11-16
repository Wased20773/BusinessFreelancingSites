import { pageOf, paginate } from "@/lib/paginate";

describe("paginate", () => {
  const items = Array.from({ length: 14 }, (_, index) => index);

  it("returns the page's items and where it starts in the full list", () => {
    expect(paginate(items, 3, 6)).toEqual({
      items: [12, 13],
      page: 3,
      pageCount: 3,
      start: 12,
    });
  });
});

describe("pageOf", () => {
  it("finds the page an item is on", () => {
    expect(pageOf(0, 6)).toBe(1);
    expect(pageOf(5, 6)).toBe(1);
    expect(pageOf(6, 6)).toBe(2);
    expect(pageOf(13, 6)).toBe(3);
  });

  it("treats a missing item (-1) as the first page", () => {
    expect(pageOf(-1, 6)).toBe(1);
  });
});
