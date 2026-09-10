"use client";

import "../../page.css";
import Divider from "@/components/layout/Divider";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import PageHeading from "@/components/ui/PageHeader";
import PageState from "@/components/ui/PageState";
import { ACCESS_LEVEL } from "@/types/types";

export default function AccessLevelsPage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { data: session, status } = useSession();
  const currentAccessLevel = session?.user?.accessLevel;
  const canViewAccessLevel =
    currentAccessLevel === ACCESS_LEVEL.developer ||
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin ||
    currentAccessLevel === ACCESS_LEVEL.staff;

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper: false,
    canView: canViewAccessLevel,
    pageTitle: "Access Level",
    reason: "Your current access level does not include access level viewing.",
  });

  if (pageState) {
    return pageState;
  }

  return (
    <section
      aria-labelledby="access-level-heading"
      className="max-w-[1000px] mx-auto p-5 pt-0"
    >
      {/* Heading */}
      <PageHeading
        path={`/businesses/${businessId}/users`}
        ariaLabel="Return to members"
        setIsLoading={setIsLoading}
        headingId="access-level-heading"
        heading="Access Level"
      />

      <p className="text-gray-500 mt-2">
        Understand what each business role is allowed to manage.
      </p>

      <section className="border border-gray-300 rounded-xl mt-5 p-5">
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
