import ArrowIcon from "@/components/icons/arrow";
import Divider from "@/components/layout/Divider";
import Link from "next/link";
import "../../page.css";

export default function AccessLevelsPage() {
  return (
    <div aria-labelledby="access-level-heading">
      <div className="flex items-center gap-2 mb-[1.5rem]">
        <Link href="/dashboard/users">
          <ArrowIcon direction="left" size={50} />
        </Link>
        <h1 id="access-level-heading">Access Level</h1>
      </div>

      <div className="dashboard-card">
        <p>
          This defines the permissions a user has in a business. This allows
          certain users to add, update, or delete content from their business
          while others cant. Please read the
          <span className="font-semibold"> Access Level</span> descriptions
          carefully before making a decision.
        </p>

        <Divider />

        {/* Business.Role: accessLevel, description */}

        <article className="flex flex-col gap-3">
          <div>
            <p className="font-bold">Developer</p>
            <p>
              Responsible for the technical integration of the business website.
              Can create, view, rotate, deactivate, and delete Business API keys
              used by the website.
            </p>
          </div>

          <div>
            <p className="font-bold">Owner</p>
            <p>
              Full business-level access. Can add, update, and change business
              content, manage users/roles, and transfer ownership.
            </p>
          </div>

          <div>
            <p className="font-bold">Admin</p>
            <p>
              Can add, update, and delete business content. Can manage general
              user information, but cannot remove an owner, or transfer
              ownership.
            </p>
          </div>

          <div>
            <p className="font-bold">Staff</p>
            <p>
              View-only access. Can view business information but cannot add,
              update, or delete business content. Free to update their
              credentials but not role.
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
