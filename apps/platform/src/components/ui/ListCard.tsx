import EditIcon from "@/components/icons/edit.svg";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import Divider from "@/components/layout/Divider";

type ListCardProps = {
  variant: string;
  id: string;
  path: string;
  icon: StaticImageData | string;
  title: string | null | undefined;
  subtitle: string | null | undefined;
  isLast?: boolean;
};

export default function ListCard({
  variant,
  id,
  path,
  icon,
  title,
  subtitle,
  isLast,
}: ListCardProps) {
  return (
    <>
      {/* MOBILE */}
      {variant === "mobile" && (
        <li key={id}>
          <Link
            href={path}
            aria-label="Edit"
            className="min-w-0 flex items-center gap-3"
          >
            <Image
              className="shrink-0"
              src={icon}
              alt=""
              width={50}
              height={50}
            />
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="w-max min-w-full">
                <p className="whitespace-nowrap font-semibold">{title}</p>
                <p className="whitespace-nowrap text-gray-500">{subtitle}</p>
              </div>
            </div>
            <Image
              src={EditIcon}
              alt=""
              width={50}
              height={50}
              aria-hidden="true"
            />
          </Link>

          {isLast && (
            <div className="col-span-2">
              <Divider />
            </div>
          )}
        </li>
      )}

      {/* DESKTOP */}
      {variant === "desktop" && (
        <tr className="border-gray-300">
          <th scope="row" className="px-3 py-2 font-normal">
            {title}
          </th>

          <td className="px-3 py-2">{subtitle}</td>

          <td className="px-3 py-2">
            <Image src={icon} alt="" width={30} height={30} />
          </td>

          <td>
            <Link
              href={path}
              aria-label={`Edit this social`}
              className="flex justify-center w-fit"
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
        </tr>
      )}
    </>
  );
}
