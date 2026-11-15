import EditIcon from "@/components/icons/edit.svg";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { motion } from "motion/react";
import { listRowMotion } from "@/components/motion/listMotion";

type ListCardProps = {
  variant: string;
  id: string;
  path?: string;
  icon?: StaticImageData | string;
  title: string | null | undefined;
  subtitle: string | null | undefined;
  isLast?: boolean;
  status?: {
    isActive: boolean;
  };
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  // Position in the list, so rows animate in one after another.
  index?: number;
};

export default function ListCard({
  variant,
  id,
  path,
  icon,
  title,
  subtitle,
  isLast,
  status,
  setIsLoading,
  index = 0,
}: ListCardProps) {
  const mobileContent = (
    <>
      {status && (
        <span
          aria-hidden="true"
          className={`size-3 shrink-0 rounded-full ${
            status.isActive ? "bg-emerald-500" : "bg-gray-400"
          }`}
        />
      )}

      {icon && (
        <Image
          className="size-10 shrink-0 object-contain"
          src={icon}
          alt=""
          width={40}
          height={40}
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{title}</p>
        <p className="truncate text-sm text-gray-600">{subtitle}</p>
      </div>

      {path && (
        <Image
          className="shrink-0 object-contain"
          src={EditIcon}
          alt=""
          width={30}
          height={30}
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <>
      {variant === "mobile" && (
        <motion.li
          {...listRowMotion(index)}
          className={isLast ? "border-b border-gray-200" : undefined}
          key={id}
        >
          {path ? (
            <Link
              href={path}
              aria-label={`Edit ${title ?? "entry"}`}
              className="flex min-w-0 items-center gap-3 px-3 py-2 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
              onClick={() => setIsLoading(true)}
            >
              {mobileContent}
            </Link>
          ) : (
            <div className="flex min-w-0 items-center gap-3 px-3 py-2">
              {mobileContent}
            </div>
          )}
        </motion.li>
      )}

      {variant === "desktop" && (
        <motion.tr {...listRowMotion(index)} className="text-gray-700">
          {status ? (
            <>
              <th scope="row" className="px-3 py-2 font-normal">
                <span
                  aria-hidden="true"
                  className={`mx-auto block size-3 rounded-full ${
                    status.isActive ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
              </th>
              <td className="px-3 py-2 font-medium text-gray-900">{title}</td>
            </>
          ) : (
            <th
              scope="row"
              className="px-3 py-2 text-left font-medium text-gray-900"
            >
              {title}
            </th>
          )}

          <td className="px-3 py-2">{subtitle}</td>

          {icon && (
            <td className="px-3 py-2">
              <Image src={icon} alt="" width={30} height={30} />
            </td>
          )}

          {path && (
            <td className="px-3 py-2">
              <Link
                href={path}
                aria-label={`Edit ${title ?? "entry"}`}
                className="mx-auto flex size-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500"
                onClick={() => setIsLoading(true)}
              >
                <Image
                  src={EditIcon}
                  alt=""
                  width={30}
                  height={30}
                  aria-hidden="true"
                />
              </Link>
            </td>
          )}
        </motion.tr>
      )}
    </>
  );
}
