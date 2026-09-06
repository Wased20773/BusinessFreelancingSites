import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import ChevronIcon from "@/components/icons/chevron.svg";
import { Dispatch, SetStateAction } from "react";

type ActionItemProps = {
  href: string;
  icon: StaticImageData;
  label: string;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
};

export default function ActionItem({
  href,
  icon,
  label,
  setIsLoading,
}: ActionItemProps) {
  return (
    <Link
      className="flex justify-between items-center"
      href={href}
      onClick={() => setIsLoading(true)}
    >
      <div className="flex flex-row items-center gap-3">
        <Image src={icon} alt="" width={30} height={30} loading="eager" />
        <p>{label}</p>
      </div>

      <Image
        src={ChevronIcon}
        alt="Go to"
        width={20}
        height={20}
        loading="eager"
      />
    </Link>
  );
}
