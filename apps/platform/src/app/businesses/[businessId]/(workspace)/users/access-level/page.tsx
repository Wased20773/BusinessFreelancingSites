"use client";

import ArrowIcon from "@/components/icons/arrow";
import Link from "next/link";
import "../../page.css";
import Divider from "@/components/layout/Divider";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import LoadingBar from "@/components/ui/LoadingBar";
import { useState } from "react";

export default function AccessLevelsPage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { status } = useSession();

  if (status === "loading" || isLoading) {
    return <LoadingBar />;
  }

  if (status === "unauthenticated") {
    return <p className="p-5">You must be signed in to view this page.</p>;
  }

  return (
    <section className="max-w-[1000px] mx-auto p-5">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/businesses/${businessId}/users`}
          aria-label="Return to members"
          className="shrink-0"
          onClick={() => setIsLoading(true)}
        >
          <ArrowIcon direction="left" size={42} />
        </Link>

        <div>
          <h1 className="text-3xl font-semibold">Access Levels</h1>

          <p className="text-gray-500 mt-1">
            Understand what each business role is allowed to manage.
          </p>
        </div>
      </div>

      <section className="border border-gray-300 rounded-xl p-5">
        <p className="text-gray-600 mb-6 max-w-[750px]">
          Access levels determine what a member can view or manage within a
          business. Review each role carefully before assigning permissions.
        </p>

        <div className="flex flex-col">
          <article className="pb-5">
            <h2 className="text-lg font-semibold">Developer</h2>

            <p className="text-sm text-gray-500 mt-1 mb-2">
              Technical integration access
            </p>

            <p className="text-gray-700">
              Responsible for the technical integration of the business website.
              Can create, view, rotate, deactivate, and delete Business API keys
              used by the website.
            </p>
          </article>

          <Divider />

          <article className="py-5">
            <h2 className="text-lg font-semibold">Owner</h2>

            <p className="text-sm text-gray-500 mt-1 mb-2">
              Full business access
            </p>

            <p className="text-gray-700">
              Full business-level access. Can add, update, and change business
              content, manage users and roles, and transfer ownership.
            </p>
          </article>

          <Divider />

          <article className="py-5">
            <h2 className="text-lg font-semibold">Admin</h2>

            <p className="text-sm text-gray-500 mt-1 mb-2">
              Business management access
            </p>

            <p className="text-gray-700">
              Can add, update, and delete business content. Can manage general
              user information, but cannot remove an owner or transfer
              ownership.
            </p>
          </article>

          <Divider />

          <article className="pt-5">
            <h2 className="text-lg font-semibold">Staff</h2>

            <p className="text-sm text-gray-500 mt-1 mb-2">View-only access</p>

            <p className="text-gray-700">
              Can view business information but cannot add, update, or delete
              business content. Members can update their own credentials, but
              not their assigned role.
            </p>
          </article>
        </div>
      </section>
    </section>
  );
}
