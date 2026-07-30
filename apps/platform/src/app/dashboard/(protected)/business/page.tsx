import Image from "next/image";
import "../page.css";
import ExternalLinkIcon from "@/components/icons/external-link.svg";
import Link from "next/link";
import { GET } from "@/app/api/business/route";
import { auth } from "@/auth";

export default async function BusinessPage() {
  const session = await auth();

  const businessSlug = session?.user.businessSlug;

  if (!businessSlug) {
    throw new Error("No Business is associated with this account.");
  }

  const request = new Request(
    `http://internal/api/business?slug=${encodeURIComponent(businessSlug)}`,
  );

  const response = await GET(request);

  if (!response.ok) {
    throw new Error("Failed to retrieve categories.");
  }

  const data = await response.json();

  return (
    <div aria-labelledby="business-heading">
      <h1 id="business-heading">Business</h1>

      <div className="mt-[1.5rem]">
        <section>
          {/* TODO: Render the businesses name and domain when onboarding */}
          <div>
            {/* Name */}
            <form>
              <input
                className="border-[0.1rem] border-gray-400 bg-gray-50 w-full rounded-lg border-b-[0.2rem] border-gray-300 px-3 py-1"
                type="text"
                placeholder="Enter your business name"
                value={data.name}
              />
            </form>

            {/* Domain */}
            <p className="mt-1">Your domain is:</p>
            <div className="flex items-center">
              <Image
                src={ExternalLinkIcon}
                alt="External link"
                width={15}
                height={15}
              />
              {/* TODO: Replace href with actual business domain */}
              <Link className="text-blue-500 ml-1" href="#">
                https://{data.domain}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
