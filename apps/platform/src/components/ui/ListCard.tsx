import EditIcon from "@/components/icons/edit.svg";
import Divider from "@/components/layout/Divider";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";

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
}: ListCardProps) {
  const mobileContent = (
    <>
      {status && (
        <div
          className={[
            "min-w-[1.25rem] min-h-[1.25rem] rounded-full border-[0.2rem]",
            status.isActive
              ? "border-green-500 bg-emerald-400"
              : "border-zinc-500 bg-zinc-400",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      )}

      {icon && (
        <Image className="shrink-0" src={icon} alt="" width={50} height={50} />
      )}

      <div className="flex-1 min-w-0">
        <p className="whitespace-nowrap font-semibold truncate">{title}</p>

        <p className="whitespace-nowrap text-gray-500 truncate">{subtitle}</p>
      </div>

      {path && (
        <Image
          className="shrink-0"
          src={EditIcon}
          alt=""
          width={50}
          height={50}
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <>
      {/* MOBILE */}
      {variant === "mobile" && (
        <li key={id}>
          {path ? (
            <Link
              href={path}
              aria-label="Edit"
              className="min-w-0 flex items-center gap-3"
            >
              {mobileContent}
            </Link>
          ) : (
            <div className="min-w-0 flex items-center gap-3">
              {mobileContent}
            </div>
          )}

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
          {status ? (
            <>
              <th scope="row" className="px-3 py-2 font-normal align-middle">
                <div
                  className={[
                    "size-5 mx-auto rounded-full border-[0.2rem]",
                    status.isActive
                      ? "border-green-500 bg-emerald-400"
                      : "border-zinc-500 bg-zinc-400",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </th>

              <td className="px-3 py-2 font-normal">{title}</td>
            </>
          ) : (
            <th scope="row" className="px-3 py-2 font-normal">
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
            <td>
              <div className="flex justify-center items-center">
                <Link href={path} aria-label="Edit">
                  <Image
                    src={EditIcon}
                    alt=""
                    width={30}
                    height={30}
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </td>
          )}
        </tr>
      )}
    </>
  );
}
