import SignOutButton from "@/components/auth/SignOutButton";
import "./page.css";
import Image from "next/image";
import EditIcon from "@/components/icons/edit.svg";
import Divider from "@/components/layout/Divider";
import ArrowIcon from "@/components/icons/arrow";
import PlaceholderAccountIcon from "@/components/icons/placeholder-account-black.svg";
import DropArrowIcon from "@/components/icons/drop-arrow.svg";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div aria-labelledby="overview-heading">
      <h1 className="mb-[1.5rem]" id="overview-heading">
        Overview
      </h1>

      <div>
        <section>
          {/* BusinessUser */}
          <div className="dashboard-card flex flex-col gap-3">
            <h2>Your users</h2>
            <p>
              These are the people who have been linked to your business. You
              can add new users by searching for them through the
              <span className="font-semibold"> Users</span> tab.
            </p>
            {/* TODO: Render all business users up to 5 */}
            {/* NOTE: Users can only be viewed here, when clicking "View More it should redirect to the Users" */}
            <div className="flex flex-row justify-between items-center rounded-md bg-gray-200 p-2">
              <div className="flex items-center">
                <Image
                  className="border-[2px] border-gray-800 rounded-full"
                  src={PlaceholderAccountIcon}
                  alt="Profile picture"
                  width={30}
                  height={30}
                />
                <p className="ml-[0.5rem]">A users name</p>
              </div>

              <p className="text-gray-500">Role</p>
            </div>
            <div className="flex flex-row justify-between items-center rounded-md bg-gray-200 p-2">
              <div className="flex items-center">
                <Image
                  className="border-[2px] border-gray-800 rounded-full"
                  src={PlaceholderAccountIcon}
                  alt="Profile picture"
                  width={30}
                  height={30}
                />
                <p className="ml-[0.5rem]">A users name</p>
              </div>

              <p className="text-gray-500">Role</p>
            </div>
            <div className="flex flex-row justify-between items-center rounded-md bg-gray-200 p-2">
              <div className="flex items-center">
                <Image
                  className="border-[2px] border-gray-800 rounded-full"
                  src={PlaceholderAccountIcon}
                  alt="Profile picture"
                  width={30}
                  height={30}
                />
                <p className="ml-[0.5rem]">A users name</p>
              </div>

              <p className="text-gray-500">Role</p>
            </div>
            <div className="flex flex-row justify-between items-center rounded-md bg-gray-200 p-2">
              <div className="flex items-center">
                <Image
                  className="border-[2px] border-gray-800 rounded-full"
                  src={PlaceholderAccountIcon}
                  alt="Profile picture"
                  width={30}
                  height={30}
                />
                <p className="ml-[0.5rem]">A users name</p>
              </div>

              <p className="text-gray-500">Role</p>
            </div>
            <div className="flex flex-row justify-between items-center rounded-md bg-gray-200 p-2">
              <div className="flex items-center">
                <Image
                  className="border-[2px] border-gray-800 rounded-full"
                  src={PlaceholderAccountIcon}
                  alt="Profile picture"
                  width={30}
                  height={30}
                />
                <p className="ml-[0.5rem]">A users name</p>
              </div>

              <p className="text-gray-500">Role</p>
            </div>

            <Link
              className="flex justify-center items-center"
              href="/dashboard/users"
            >
              <span className="mr-1">View More</span>
              <ArrowIcon />
            </Link>
          </div>

          <Divider />

          {/* Category */}
          <div className="dashboard-card flex flex-col gap-3">
            <h2>Categories</h2>
            <div className="grid grid-cols-[1fr_auto] items-center bg-gray-200 rounded-md p-2">
              <div className="flex flex-col min-w-0 mr-2">
                <p className="truncate">Category name</p>
                <div className="flex items-center">
                  <Image
                    src={DropArrowIcon}
                    alt="Drop arrow"
                    width={20}
                    height={20}
                    loading="eager"
                  />
                  <p className="text-gray-500 ml-1"># items</p>
                </div>
              </div>

              <Link className="p-2" href="/dashboard/menu">
                <Image
                  src={EditIcon}
                  alt="Edit this category"
                  width={30}
                  height={30}
                  loading="eager"
                />
              </Link>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center bg-gray-200 rounded-md p-2">
              <div className="flex flex-col min-w-0 mr-2">
                <p className="truncate">Category name</p>
                <div className="flex items-center">
                  <Image
                    src={DropArrowIcon}
                    alt="Drop arrow"
                    width={20}
                    height={20}
                    loading="eager"
                  />
                  <p className="text-gray-500 ml-1"># items</p>
                </div>
              </div>

              <Link className="p-2" href="/dashboard/menu">
                <Image
                  src={EditIcon}
                  alt="Edit this category"
                  width={30}
                  height={30}
                  loading="eager"
                />
              </Link>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center bg-gray-200 rounded-md p-2">
              <div className="flex flex-col min-w-0 mr-2">
                <p className="truncate">Category name</p>
                <div className="flex items-center">
                  <Image
                    src={DropArrowIcon}
                    alt="Drop arrow"
                    width={20}
                    height={20}
                    loading="eager"
                  />
                  <p className="text-gray-500 ml-1"># items</p>
                </div>
              </div>

              <Link className="p-2" href="/dashboard/menu">
                <Image
                  src={EditIcon}
                  alt="Edit this category"
                  width={30}
                  height={30}
                  loading="eager"
                />
              </Link>
            </div>

            <Link
              className="flex justify-center items-center"
              href="/dashboard/menu"
            >
              <span className="mr-1">View More</span>
              <ArrowIcon />
            </Link>
          </div>

          <Divider />

          {/* Location */}
          <div className="dashboard-card flex flex-col gap-3">
            <h2>Locations</h2>
            {/* TODO: Show the locations for the business, only 1 (newest) */}
            <div className="bg-gray-200 p-2 rounded-lg ">
              {/* Header */}
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">Address St 12345</span>
                <Link className="p-2" href="/dashboard/locations">
                  <Image
                    src={EditIcon}
                    alt="Edit this location"
                    width={30}
                    height={30}
                    loading="eager"
                  />
                </Link>
              </div>

              {/* Body */}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-500">
                    <th className="py-2 mx-auto font-semibold">Open</th>
                    <th className="py-2 text-left font-semibold">Day</th>
                    <th className="py-2 text-right font-semibold">Time</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className="py-2">
                      <div className="border rounded-full w-[0.75rem] h-[0.75rem] bg-red-400 mx-auto"></div>
                    </td>
                    <td>Sunday</td>
                    <td className="text-right">---</td>
                  </tr>

                  <tr>
                    <td className="py-2">
                      <div className="border rounded-full w-[0.75rem] h-[0.75rem] bg-green-400 mx-auto"></div>
                    </td>
                    <td>Monday</td>
                    <td className="text-right">9:00-20:00</td>
                  </tr>

                  <tr>
                    <td className="py-2">
                      <div className="border rounded-full w-[0.75rem] h-[0.75rem] bg-green-400 mx-auto"></div>
                    </td>
                    <td>Tuesday</td>
                    <td className="text-right">9:00-20:00</td>
                  </tr>

                  <tr>
                    <td className="py-2">
                      <div className="border rounded-full w-[0.75rem] h-[0.75rem] bg-green-400 mx-auto"></div>
                    </td>
                    <td>Wednesday</td>
                    <td className="text-right">9:00-20:00</td>
                  </tr>

                  <tr>
                    <td className="py-2">
                      <div className="border rounded-full w-[0.75rem] h-[0.75rem] bg-green-400 mx-auto"></div>
                    </td>
                    <td>Thursday</td>
                    <td className="text-right">9:00-20:00</td>
                  </tr>

                  <tr>
                    <td className="py-2">
                      <div className="border rounded-full w-[0.75rem] h-[0.75rem] bg-green-400 mx-auto"></div>
                    </td>
                    <td>Friday</td>
                    <td className="text-right">9:00-20:00</td>
                  </tr>

                  <tr>
                    <td className="py-2">
                      <div className="border rounded-full w-[0.75rem] h-[0.75rem] bg-red-400 mx-auto"></div>
                    </td>
                    <td>Saturday</td>
                    <td className="text-right">---</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Link
              className="flex justify-center items-center"
              href="/dashboard/locations"
            >
              <span className="mr-1">View More</span>
              <ArrowIcon />
            </Link>
          </div>
        </section>
      </div>
      <SignOutButton />
    </div>
  );
}
