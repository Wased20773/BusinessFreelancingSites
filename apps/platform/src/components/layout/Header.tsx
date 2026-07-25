import Image from "next/image";
import Link from "next/link";
import Logo from "../../../public/logo.svg";
import "./Header.css";

export default function Home() {
    return (
        <header className="border-b border-gray-300 shadow-sm px-6">
            <nav className="mx-auto max-w-[1200px] grid grid-cols-[auto_1fr_auto] gap-10">
                <Link className="flex justify-start items-center gap-2 py-2" href="/" aria-label="Business Platform home">
                    <Image
                        src={Logo}
                        alt="Business Platform"
                        width={50}
                        height={50}
                    />
                    Business Platform
                </Link>

                <ul className="desktop-nav-links flex justify-start items-center text-gray-600">
                    <li className="nav-link"><Link href="/" aria-label="Home">Home</Link></li>
                    <li className="nav-link"><Link href="/#features" aria-label="Features">Features</Link></li>
                    <li className="nav-link"><Link href="/#contact" aria-label="Contact">Contact</Link></li>
                </ul>

                <div className="flex justify-end items-center py-2">
                    <Link className="bg-blue-500 rounded-md text-gray-50 px-4 py-1" href="/dashboard/login" aria-label="Login">Login</Link>
                    <ul className="mobile-nav-links">
                        <li className="nav-link"><Link href="/" aria-label="Home">Home</Link></li>
                        <li className="nav-link"><Link href="/#features" aria-label="Features">Features</Link></li>
                        <li className="nav-link"><Link href="/#contact" aria-label="Contact">Contact</Link></li>
                    </ul>
                </div>
            </nav>
        </header>
    );
}