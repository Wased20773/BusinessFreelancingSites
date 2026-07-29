import Image from "next/image";
import "../page.css";
import ExternalLinkIcon from "@/components/icons/external-link.svg";
import Link from "next/link";

export default function BusinessPage() {
  return (
    <div aria-labelledby="business-heading">
      <h1 id="business-heading">Business</h1>

      <div className="mt-[1.5rem]">
        <section>
          {/* TODO: Render the businesses name and domain when onboarding */}
          <div>
            {/* Name */}
            <input
              className="border-[0.1rem] border-gray-400 bg-gray-50 w-full rounded-lg border-b-[0.2rem] border-gray-300 px-3 py-1"
              type="text"
              placeholder="Enter your business name"
            />

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
                https://place-business-domain-here.com
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
