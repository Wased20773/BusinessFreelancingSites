import Image from "next/image";
import Logo from "../../public/logo.svg";
import Card from "@/components/Card"
import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Navigation Bar */}
      <header className="p-2">
        <Link href="/dashboard/login" className="flex flex-row items-center gap-5 w-fit ml-3">
          <Image
            src={Logo}
            alt="Platform logo"
            width={50}
            height={50}
            loading="eager"
            priority
          />
          <h2>Business Platform</h2>
        </Link>

      </header>

      <div className="flex flex-col gap-5">
        {/* Hero */}
        <div className="border">
          <div className="flex flex-row p-5">
            <div className="flex-1 flex justify-start items-end">
              <Link
                href="/dashboard/login"
                className="border rounded-lg px-2 py-1 bg-blue-400"
              >Get Started</Link>
            </div>

            <div className="flex-1">
              <h2>Hero Header Text</h2>
              <p>Paragraph Text</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="border flex flex-col items-center">

          {/* Workflow cards */}
          <p className="mb-10">How it works</p>
          <section className="flex flex-row gap-10">
            <Card styleVarient="workflow-card" order={1} title="Change my title" context="Change my context"/>
            <Card styleVarient="workflow-card" order={2} title="Change my title" context="Change my context"/>
            <Card styleVarient="workflow-card" order={3} title="Change my title" context="Change my context"/>
          </section>

          {/* Feature section */}
          <p className="mt-10">What are some features</p>
          <section className="flex flex-col gap-5">
            <Card styleVarient="media-card" flow="left" title="Change my title" context="Change my context"/>
            <Card styleVarient="media-card" flow="right" title="Change my title" context="Change my context"/>
          </section>
        </main>

        {/* Footer */}
        <p>footer content</p>
      </div>
    </>
  );
}
