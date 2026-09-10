import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import ArrowIcon from "@/components/icons/arrow";

type PageHeadingProps = {
  businessId: string;
  locationId: string;
  path: string;
  ariaLabel: string;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  headingId: string;
  heading: string;
};

export default function PageHeading({
  businessId,
  locationId,
  path,
  ariaLabel,
  setIsLoading,
  headingId,
  heading,
}: PageHeadingProps) {
  const returnHref = `/businesses/${businessId}/locations/${locationId}/dashboard/${path}`;

  return (
    <>
      <header className="h-[70px] z-10 w-full fixed flex items-center gap-3 bg-white shadow-lg shadow-white">
        <Link
          href={returnHref}
          aria-label={ariaLabel}
          onClick={() => setIsLoading(true)}
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id={headingId} className="truncate">
          {heading}
        </h1>
      </header>

      {/* Reserves the fixed header’s space */}
      <div aria-hidden="true" className="h-[70px]" />
    </>
  );
}
