import Image from "next/image";
import PlaceholderAccountIcon from "@/components/icons/placeholder-account-black.svg";
import GoogleLogoIcon from "@/components/icons/google-logo.svg";
import "../page.css";
import ArrowIcon from "@/components/icons/arrow";
import Link from "next/link";
import Divider from "@/components/layout/Divider";
import KeyIcon from "@/components/icons/key.svg";
import ChevronIcon from "@/components/icons/chevron.svg";
import SearchIcon from "@/components/icons/search.svg";

export default function UsersPage() {
  return (
    <div aria-labelledby="users-heading">
      <h1 id="users-heading">Users</h1>
      {/* Business.Role: accessLevel, description */}
      {/* BusinessUser.Role: accessLevel */}
      {/* BusinessUser.User: image, name, username, email, emailVerified, createdAt, updatedAt */}
      {/* BusinessUser.User.Account: provider */}
      <div className="mt-[1.5rem]">
        <section className="dashboard-card">
          {/* AccessLevel description */}
          <Link
            className="flex justify-between items-center"
            href="/dashboard/users/access-level"
          >
            <div className="flex flex-row items-center gap-3">
              <Image
                src={KeyIcon}
                alt="Access Key Icon"
                width={30}
                height={30}
                loading="eager"
              />
              <p>Access Levels</p>
            </div>

            <Image
              src={ChevronIcon}
              alt="Go to"
              width={20}
              height={20}
              loading="eager"
            />
          </Link>

          <Divider />

          <Link
            className="flex justify-between items-center"
            href="/dashboard/users/search"
          >
            <div className="flex flex-row items-center gap-3">
              <Image
                src={SearchIcon}
                alt="Search icon"
                width={30}
                height={30}
                loading="eager"
              />
              <p>Search</p>
            </div>

            <Image
              src={ChevronIcon}
              alt="Go to"
              width={20}
              height={20}
              loading="eager"
            />
          </Link>
        </section>

        <Divider />

        <section>
          <div className="dashboard-card flex flex-col gap-3">
            <p>You can click a user to view more details.</p>

            {/* Load up to 5 BusinessUsers */}
            <Link
              className="flex flex-row items-stretch rounded-md bg-gray-200"
              href="/dashboard/users/1-2-3"
            >
              <div className="flex min-w-0 flex-1 flex-col overflow-x-auto gap-3 p-2">
                <div className="min-w-max flex items-center gap-2">
                  <Image
                    className="rounded-full border-2 border-gray-800"
                    src={PlaceholderAccountIcon}
                    alt="Profile picture"
                    width={30}
                    height={30}
                  />

                  <p>A users name</p>
                </div>

                <div className="flex w-fit min-w-max min-w-0 items-center gap-2 rounded-md bg-gray-100 px-2 py-1">
                  <div className="flex items-center justify-center">
                    <Image
                      src={GoogleLogoIcon}
                      alt="Google account provider"
                      width={15}
                      height={15}
                    />
                  </div>

                  <span className="text-gray-500">account10@business.com</span>
                </div>
              </div>

              <div className="w-[4.5rem] flex justify-center items-center rounded-r-md border-l-[0.1rem] border-l-gray-400 bg-gray-300 px-3">
                <p className="text-gray-600">Owner</p>
              </div>
            </Link>

            <Link
              className="flex flex-row items-stretch rounded-md bg-gray-200"
              href="/dashboard/users/4-5-6"
            >
              <div className="flex min-w-0 flex-1 flex-col overflow-x-auto gap-3 p-2">
                <div className="min-w-max flex items-center gap-2">
                  <Image
                    className="rounded-full border-2 border-gray-800"
                    src={PlaceholderAccountIcon}
                    alt="Profile picture"
                    width={30}
                    height={30}
                  />

                  <p>A users name</p>
                </div>

                <div className="flex w-fit min-w-max min-w-0 items-center gap-2 rounded-md bg-gray-100 px-2 py-1">
                  <div className="flex items-center justify-center">
                    <Image
                      src={GoogleLogoIcon}
                      alt="Google account provider"
                      width={15}
                      height={15}
                    />
                  </div>

                  <span className="text-gray-500">account20@business.com</span>
                </div>
              </div>

              <div className="w-[4.5rem] flex justify-center items-center rounded-r-md border-l-[0.1rem] border-l-gray-400 bg-gray-300 px-3">
                <p className="text-gray-600">Admin</p>
              </div>
            </Link>

            <Link
              className="flex flex-row items-stretch rounded-md bg-gray-200"
              href="/dashboard/users/7-8-9"
            >
              <div className="flex min-w-0 flex-1 flex-col overflow-x-auto gap-3 p-2">
                <div className="min-w-max flex items-center gap-2">
                  <Image
                    className="rounded-full border-2 border-gray-800"
                    src={PlaceholderAccountIcon}
                    alt="Profile picture"
                    width={30}
                    height={30}
                  />

                  <p>A users name</p>
                </div>

                <div className="flex w-fit min-w-max min-w-0 items-center gap-2 rounded-md bg-gray-100 px-2 py-1">
                  <div className="flex items-center justify-center">
                    <Image
                      src={GoogleLogoIcon}
                      alt="Google account provider"
                      width={15}
                      height={15}
                    />
                  </div>

                  <span className="text-gray-500">account30@business.com</span>
                </div>
              </div>

              <div className="w-[4.5rem] flex justify-center items-center rounded-r-md border-l-[0.1rem] border-l-gray-400 bg-gray-300 px-3">
                <p className="text-gray-600">Staff</p>
              </div>
            </Link>

            <Link
              className="flex flex-row items-stretch rounded-md bg-gray-200"
              href="/dashboard/users/10-11-12"
            >
              <div className="flex min-w-0 flex-1 flex-col overflow-x-auto gap-3 p-2">
                <div className="min-w-max flex items-center gap-2">
                  <Image
                    className="rounded-full border-2 border-gray-800"
                    src={PlaceholderAccountIcon}
                    alt="Profile picture"
                    width={30}
                    height={30}
                  />

                  <p>A users name</p>
                </div>

                <div className="flex w-fit min-w-max min-w-0 items-center gap-2 rounded-md bg-gray-100 px-2 py-1">
                  <div className="flex items-center justify-center">
                    <Image
                      src={GoogleLogoIcon}
                      alt="Google account provider"
                      width={15}
                      height={15}
                    />
                  </div>

                  <span className="text-gray-500">account40@business.com</span>
                </div>
              </div>

              <div className="w-[4.5rem] flex justify-center items-center rounded-r-md border-l-[0.1rem] border-l-gray-400 bg-gray-300 px-3">
                <p className="text-gray-600">Admin</p>
              </div>
            </Link>

            <Link
              className="flex flex-row items-stretch rounded-md bg-gray-200"
              href="/dashboard/users/13-14-15"
            >
              <div className="flex min-w-0 flex-1 flex-col overflow-x-auto gap-3 p-2">
                <div className="min-w-max flex items-center gap-2">
                  <Image
                    className="rounded-full border-2 border-gray-800"
                    src={PlaceholderAccountIcon}
                    alt="Profile picture"
                    width={30}
                    height={30}
                  />

                  <p>A users name</p>
                </div>

                <div className="flex w-fit min-w-max min-w-0 items-center gap-2 rounded-md bg-gray-100 px-2 py-1">
                  <div className="flex items-center justify-center">
                    <Image
                      src={GoogleLogoIcon}
                      alt="Google account provider"
                      width={15}
                      height={15}
                    />
                  </div>

                  <span className="text-gray-500">account50@business.com</span>
                </div>
              </div>

              <div className="w-[4.5rem] flex justify-center items-center rounded-r-md border-l-[0.1rem] border-l-gray-400 bg-gray-300 px-3">
                <p className="text-gray-600">Staff</p>
              </div>
            </Link>

            <div className="flex justify-center items-center">
              <span className="mr-1">Load More</span>
              <ArrowIcon direction="down" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
