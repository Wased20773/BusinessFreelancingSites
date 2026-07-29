import ArrowIcon from "@/components/icons/arrow";
import Link from "next/link";
import "../../page.css";
import Divider from "@/components/layout/Divider";
import Image from "next/image";
import TrashIcon from "@/components/icons/trash-red.svg";
import EditIcon from "@/components/icons/edit.svg";

type UserDetailsPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function UserDetailsPage({
  params,
}: UserDetailsPageProps) {
  const { userId } = await params;

  return (
    <div aria-labelledby="user-details-heading">
      <Link href="/dashboard/users">
        <ArrowIcon direction="left" size={50} />
      </Link>
      <h1 id="user-details-heading">User details</h1>
      {/* BusinessUser.Role: accessLevel */}
      {/* BusinessUser.User: image, name, username, email, emailVerified, createdAt, updatedAt */}
      {/* BusinessUser.User.Account: provider */}

      <section className="dashboard-card mt-4 mb-4">
        <h2>General</h2>

        <div className="flex flex-col">
          <p>
            Name: <span>Users name</span>
          </p>
          <p>
            Email: <span>Users email</span>
          </p>
          <p>
            Username: <span>Users username</span>
          </p>
        </div>
      </section>

      <section className="dashboard-card mb-4">
        <div className="flex justify-between">
          <h2>Permissions</h2>

          <Image
            src={EditIcon}
            alt="Edit users permisions"
            width={30}
            height={30}
          />
        </div>

        <p>
          Access Level: <span>Users access level</span>
        </p>
      </section>

      <section className="dashboard-card">
        <h2>Timestamps</h2>

        <div className="flex flex-col">
          <p>
            createdAt: <span>Users createdAt</span>
          </p>
          <p>
            updatedAt: <span>Users updatedAt</span>
          </p>
        </div>
      </section>

      <Divider />

      <button
        className="w-full border border-red-500 rounded-2xl bg-red-300 flex justify-center items-center px-3 py-1"
        type="button"
      >
        <Image src={TrashIcon} alt="Remove User" />
      </button>
    </div>
  );
}
