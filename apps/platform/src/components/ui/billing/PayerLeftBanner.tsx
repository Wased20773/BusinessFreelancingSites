import type { PayerLeftNotice } from "@/lib/billing/payerLeftNotice";
import { formatDateTime } from "@/lib/time/formatDateTime";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";

type PayerLeftBannerProps = {
  notice: PayerLeftNotice;
  businessId: string;
};

/*
 *   Shown to owners across the workspace when the payer left: the plan stops
 *   at the end of the paid month unless someone subscribes.
 **/
export default function PayerLeftBanner({
  notice,
  businessId,
}: PayerLeftBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-900"
    >
      <p className="flex items-start gap-2">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-500" />
        <span>
          <span className="font-medium">{notice.payerName}</span> left the
          business, so the plan ends on {formatDateTime(notice.endsAt, "date")}.
          Subscribe to keep it.
        </span>
      </p>

      <Link
        href={`/businesses/${businessId}/billing`}
        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 font-medium text-white hover:bg-amber-600"
      >
        Go to Billing
      </Link>
    </div>
  );
}
