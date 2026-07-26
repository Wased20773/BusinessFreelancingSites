import Image from "next/image";
import Link from "next/link";
import "@/components/layout/dashboard/SideBar.css"
import Logo from "../../../../public/logo.svg"

type SideBarProps = {
    selected: string;
}

export default function SideBar({selected}: SideBarProps) {
    return (
        <aside className="border-r border-gray-300 grid grid-rows-[auto_1fr_auto] bg-white min-w-[250px]">
            {/* Client Logo + Name */}
            <div className="border-b border-gray-300 p-2 grid grid-cols-[auto_1fr] items-center">
                <Image src={Logo} alt="Client logo" width={50} height={50}></Image>
                <span className="font-bold">`Business-Name`</span>
            </div>

            {/* Navigation Links */}
            <nav className="border-b border-gray-300 p-2">
                <ul className="flex flex-col gap-1">
                    <li className={["sidebar-nav-links", selected === "Overview" && "selected"].filter(Boolean).join(" ")}>
                        <Link href={"/dashboard/"}>Overview</Link>
                    </li>
                    <li className={["sidebar-nav-links", selected === "Business" && "selected"].filter(Boolean).join(" ")}>
                        <Link href={"/dashboard/business"}>Business</Link>
                    </li>
                    <li className={["sidebar-nav-links", selected === "Users" && "selected"].filter(Boolean).join(" ")}>
                        <Link href={"/dashboard/users"}>Users</Link>
                    </li>
                    <li className={["sidebar-nav-links", selected === "Categories" && "selected"].filter(Boolean).join(" ")}>
                        <Link href={"/dashboard/categories"}>Categories</Link>
                    </li>
                    <li className={["sidebar-nav-links", selected === "Locations" && "selected"].filter(Boolean).join(" ")}>
                        <Link href={"/dashboard/locations"}>Locations</Link>
                    </li>
                    <li className={["sidebar-nav-links", selected === "Contacts" && "selected"].filter(Boolean).join(" ")}>
                        <Link href={"/dashboard/contacts"}>Contacts</Link>
                    </li>
                    <li className={["sidebar-nav-links", selected === "Socials" && "selected"].filter(Boolean).join(" ")}>
                        <Link href={"/dashboard/socials"}>Socials</Link>
                    </li>
                </ul>
            </nav>

            {/* Account */}
            <div className="flex flex-col p-2 gap-1">
                <Link className={["sidebar-nav-links", selected === "Settings" && "selected"].filter(Boolean).join(" ")} href={"/dashboard/settings"}>
                    `icon` Settings
                </Link>
                <div className="grid grid-cols-[auto_1fr] items-center">
                    <Image src={Logo}  alt="Account profile" height={35} width={35}></Image>
                    <div className="px-2">
                        <span>`Name`</span>
                        <span>`Role`</span>
                    </div>
                </div>
            </div>
        </aside>
    )
}