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
      <header className="z-10 w-full sticky top-0 bg-white shadow-lg shadow-white px-5 md:pt-5">
        <Link
          className="flex items-center gap-3"
          href={path}
          aria-label={ariaLabel}
          onClick={() => setIsLoading(true)}
        >
          <ArrowIcon direction="left" size={50} />
          <h1 id={headingId} className="truncate">
            {heading}
          </h1>
        </Link>
      </header>

      {/* Reserves the fixed header’s space
      // <div aria-hidden="true" className="h-[70px]" /> */}
    </>
  );
}
