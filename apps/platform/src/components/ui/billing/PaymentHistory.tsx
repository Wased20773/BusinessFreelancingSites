"use client";

import { listRowMotion } from "@/components/motion/listMotion";
import { formatPrice } from "@/lib/billing/formatPrice";
import {
  daysInMonth,
  filterPayments,
  paginate,
  paymentYears,
  type PaymentFilter,
  type RecentRange,
} from "@/lib/billing/paymentFilters";
import { formatDateTime } from "@/lib/time/formatDateTime";
import type { AccountPaymentJson } from "@/types/types";
import { ChevronLeft, ChevronRight, ExternalLink, Receipt } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

type Show = "all" | RecentRange | "date";

const SHOW_OPTIONS: { value: Show; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "year", label: "Last year" },
  { value: "date", label: "Pick a date" },
];

const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(2000, month, 1),
  ),
);

const selectClass =
  "mt-1 block rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 text-sm disabled:opacity-50";

const pageButtonClass =
  "flex size-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40";

/*
 *   The heading, filters, table, and page buttons of Settings → Billing's
 *   payment history. Shows 10 payments per page. Filters are one at a time:
 *   all time, a recent range, or a year with an optional month and day.
 **/
export default function PaymentHistory({
  payments,
}: {
  payments: AccountPaymentJson[];
}) {
  const years = useMemo(() => paymentYears(payments), [payments]);

  const [show, setShow] = useState<Show>("all");
  const [year, setYear] = useState<number>(
    years[0] ?? new Date().getFullYear(),
  );
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);

  const filter: PaymentFilter =
    show === "all"
      ? { kind: "all" }
      : show === "date"
        ? { kind: "date", year, month, day }
        : { kind: "recent", range: show };

  const filtered = filterPayments(payments, filter);
  const current = paginate(filtered, page);

  // Any filter change starts again from the first page.
  function changeFilter(update: () => void) {
    update();
    setPage(1);
  }

  function clearFilter() {
    changeFilter(() => {
      setShow("all");
      setMonth(null);
      setDay(null);
    });
  }

  return (
    <>
      <h2
        id="payment-history-heading"
        className="text-base font-semibold text-gray-900"
      >
        Payment history
      </h2>

      {payments.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">No payments yet.</p>
      ) : (
        <>
          {/* Filters */}
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-gray-900">
              Filter
              <select
                className={selectClass}
                value={show}
                onChange={(event) =>
                  changeFilter(() => setShow(event.target.value as Show))
                }
              >
                {SHOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {show === "date" && (
              <>
                <label className="text-sm font-medium text-gray-900">
                  Year
                  <select
                    className={selectClass}
                    value={year}
                    onChange={(event) =>
                      changeFilter(() => {
                        const nextYear = Number(event.target.value);
                        setYear(nextYear);

                        // Feb 29 doesn't exist in every year.
                        if (
                          month !== null &&
                          day !== null &&
                          day > daysInMonth(nextYear, month)
                        ) {
                          setDay(null);
                        }
                      })
                    }
                  >
                    {years.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-gray-900">
                  Month
                  <select
                    className={selectClass}
                    value={month ?? ""}
                    onChange={(event) =>
                      changeFilter(() => {
                        const nextMonth =
                          event.target.value === ""
                            ? null
                            : Number(event.target.value);
                        setMonth(nextMonth);

                        // A day only makes sense inside a month that has it.
                        if (
                          nextMonth === null ||
                          (day !== null && day > daysInMonth(year, nextMonth))
                        ) {
                          setDay(null);
                        }
                      })
                    }
                  >
                    <option value="">Any month</option>
                    {MONTHS.map((name, index) => (
                      <option key={name} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-gray-900">
                  Day
                  <select
                    className={selectClass}
                    value={day ?? ""}
                    disabled={month === null}
                    title={month === null ? "Pick a month first" : undefined}
                    onChange={(event) =>
                      changeFilter(() =>
                        setDay(
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                        ),
                      )
                    }
                  >
                    <option value="">Any day</option>
                    {month !== null &&
                      Array.from(
                        { length: daysInMonth(year, month) },
                        (_, index) => index + 1,
                      ).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                </label>
              </>
            )}

            {show !== "all" && (
              <button
                type="button"
                onClick={clearFilter}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Clear
              </button>
            )}
          </div>

          <p className="mt-3 text-sm text-gray-500" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "payment" : "payments"}
          </p>

          {filtered.length === 0 ? (
            <div className="mt-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center">
              <p className="text-sm text-gray-600">
                No payments match this filter.
              </p>
              <button
                type="button"
                onClick={clearFilter}
                className="mt-2 text-sm font-medium text-sky-600 hover:underline"
              >
                Show all payments
              </button>
            </div>
          ) : (
            // contain: paint keeps the 560px table inside this scroll box. Without
            // it, while the card has a transform (its entry animation), browsers
            // count the table's full width toward the page, which then scrolls
            // sideways into blank space on phones.
            <div className="mt-2 overflow-x-auto [contain:paint]">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-gray-200 text-gray-500">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Date
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Business
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Description
                    </th>
                    <th
                      scope="col"
                      className="py-2 pr-3 text-right font-medium"
                    >
                      Amount
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      <span className="sr-only">Receipt</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {current.items.map((payment, index) => (
                    <motion.tr key={payment.id} {...listRowMotion(index)}>
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-600">
                        {formatDateTime(payment.paidAt, "date")}
                      </td>
                      <td className="py-2 pr-3 text-gray-900">
                        {payment.businessName ?? (
                          <span className="italic text-gray-400">
                            Deleted business
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-gray-600">
                        {payment.description}
                        {payment.kind === "credit" ? (
                          <span className="block text-xs text-gray-400">
                            Unused time from a plan change
                          </span>
                        ) : (
                          payment.paidFromCredit > 0 && (
                            <span className="block text-xs text-emerald-600">
                              {payment.paidFromCredit >= payment.amount
                                ? "Paid from credit"
                                : `${formatPrice({
                                    amount: payment.paidFromCredit,
                                    currency: payment.currency,
                                  })} from credit`}
                            </span>
                          )
                        )}
                      </td>
                      <td
                        className={`py-2 pr-3 text-right font-medium whitespace-nowrap ${
                          payment.kind === "credit"
                            ? "text-emerald-600"
                            : "text-gray-900"
                        }`}
                      >
                        {formatPrice(payment)}
                      </td>
                      <td className="py-2 text-right">
                        {payment.receiptUrl && (
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-600 hover:underline"
                          >
                            <Receipt size={14} />
                            Receipt
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Page buttons, centered under the table */}
          {current.pageCount > 1 && (
            <nav
              aria-label="Payment history pages"
              className="mt-4 flex items-center justify-center gap-3"
            >
              <button
                type="button"
                className={pageButtonClass}
                aria-label="Previous page"
                disabled={current.page === 1}
                onClick={() => setPage(current.page - 1)}
              >
                <ChevronLeft size={18} />
              </button>

              <span
                className="text-sm tabular-nums text-gray-600"
                aria-live="polite"
              >
                Page {current.page} of {current.pageCount}
              </span>

              <button
                type="button"
                className={pageButtonClass}
                aria-label="Next page"
                disabled={current.page === current.pageCount}
                onClick={() => setPage(current.page + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
