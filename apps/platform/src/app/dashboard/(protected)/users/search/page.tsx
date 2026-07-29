import ArrowIcon from "@/components/icons/arrow";
import SearchIcon from "@/components/icons/search.svg";
import Image from "next/image";
import Link from "next/link";
import PlaceholderAccountIcon from "@/components/icons/placeholder-account-black.svg";
import "../../page.css";
import AddIcon from "@/components/icons/add.svg";
import Divider from "@/components/layout/Divider";
import GoogleLogoIcon from "@/components/icons/google-logo.svg";

export default function SearchPage() {
  return (
    <div aria-labelledby="search-heading">
      <Link href="/dashboard/users">
        <ArrowIcon direction="left" size={50} />
      </Link>
      <h1 id="search-heading">Search</h1>

      <section className="mt-[1.5rem]">
        <form className="grid grid-cols-[1fr_auto] gap-2 mb-5" role="search">
          <label className="col-span-2" htmlFor="user-email">
            A user is unique by email. Enter an email address to search for a
            user.
          </label>

          <input
            id="user-email"
            name="email"
            className="w-full rounded-lg border-[0.1rem] border-gray-400 border-b-[0.2rem] bg-gray-50 px-3 py-1"
            type="email"
            placeholder="user@email.com"
            autoComplete="email"
          />

          <button type="submit">
            <Image
              src={SearchIcon}
              alt="Search user button"
              width={25}
              height={25}
            />
          </button>
        </form>

        {/* Search result */}
        {/* TODO: Render all accounts discovered from the query request */}
        {/* NOTE: Render <Divider /> only if it is not the last item */}
        <ul className="dashboard-card">
          <li>
            <article className="flex flex-row items-center justify-between rounded-md p-2">
              <div className="flex items-center overflow-x-auto">
                <Image
                  className="border-[2px] border-gray-800 rounded-full"
                  src={PlaceholderAccountIcon}
                  alt="Profile picture"
                  width={30}
                  height={30}
                />
                <div className="min-w-max flex items-center ml-[0.5rem]">
                  <Image
                    src={GoogleLogoIcon}
                    alt="Users provider"
                    width={15}
                    height={15}
                  />
                  <span className="ml-[0.25rem]">account10@business.com</span>
                </div>
              </div>
              <div className="shrink-0 border-2 border-gray-400 rounded-full p-1.5">
                <Image src={AddIcon} alt="Add button" width={20} height={20} />
              </div>
            </article>

            <Divider />
          </li>
          <li>
            <article className="flex flex-row items-center justify-between rounded-md p-2">
              <div className="flex items-center overflow-x-auto">
                <Image
                  className="border-[2px] border-gray-800 rounded-full"
                  src={PlaceholderAccountIcon}
                  alt="Profile picture"
                  width={30}
                  height={30}
                />
                <div className="min-w-max flex items-center ml-[0.5rem]">
                  <Image
                    src={GoogleLogoIcon}
                    alt="Users provider"
                    width={15}
                    height={15}
                  />
                  <span className="ml-[0.25rem]">account20@business.com</span>
                </div>
              </div>
              <div className="shrink-0 border-2 border-gray-400 rounded-full p-1.5">
                <Image src={AddIcon} alt="Add button" width={20} height={20} />
              </div>
            </article>

            <Divider />
          </li>
          <li>
            <article className="flex flex-row items-center justify-between rounded-md p-2">
              <div className="flex items-center overflow-x-auto">
                <Image
                  className="border-[2px] border-gray-800 rounded-full"
                  src={PlaceholderAccountIcon}
                  alt="Profile picture"
                  width={30}
                  height={30}
                />
                <div className="min-w-max flex items-center ml-[0.5rem]">
                  <Image
                    src={GoogleLogoIcon}
                    alt="Users provider"
                    width={15}
                    height={15}
                  />
                  <span className="ml-[0.25rem]">account30@business.com</span>
                </div>
              </div>
              <div className="shrink-0 border-2 border-gray-400 rounded-full p-1.5">
                <Image src={AddIcon} alt="Add button" width={20} height={20} />
              </div>
            </article>
          </li>
        </ul>
      </section>
    </div>
  );
}
