import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import ArrowIcon from "@/components/icons/arrow";

type PageHeadingProps = {
  path: string;
  ariaLabel: string;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  headingId: string;
  heading: string;
};

export default function PageHeading({
  path,
  ariaLabel,
  setIsLoading,
  headingId,
  heading,
}: PageHeadingProps) {
  return (
    <>
      <header className="h-[70px] z-10 w-full fixed flex items-center gap-3 bg-white shadow-lg shadow-white">
        <Link
          href={path}
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
