import Image from "next/image";
import Logo from "../../public/logo.svg";
import Card from "@/components/Card"
import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Navigation Bar */}
      <header className="p-2">
        <Link href="/" className="flex flex-row items-center gap-5 w-fit ml-3">
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
          <div className="flex flex-col items-center p-5">
            <h2>Hero Header Text</h2>
            <p>Paragraph Text</p>
            <Link
              href="/dashboard/login"
              className="w-fit border rounded-lg px-2 py-1 bg-blue-400"
            >Get Started</Link>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 w-full border flex flex-col items-center gap-10">

          {/* Workflow cards */}
          <section className="px-3 border">
            <div className="max-auto max-w-[1200px] flex flex-col gap-10">
              <h3 className="mb-5 text-center">How it works</h3>
              <div className="grid grid-cols-3 gap-10">
                <Card
                  styleVarient="workflow-card" 
                  image={Logo} order={1}
                  title="Sign in"
                  context="Sign in with your Google account to access your business dashboard. Don't have an account yet? Simply sign in and we'll create one for you."
                />
                <Card
                  styleVarient="workflow-card"
                  image={Logo}
                  order={2}
                  title="Build it"
                  context="Add your categories, menu items, business hours, locations, contact information, social media, and more. Once everything is ready, your website is ready to share with your customers."/>
                <Card
                  styleVarient="workflow-card"
                  image={Logo}
                  order={3}
                  title="Manage it your way"
                  context="Need to make any changes? Add a new item? Mark something as sold out or seasonal? Update your website with just a few clicks. No longer will you need to wait for someone else to make the changes."
                />
              </div>
              <div className="grid grid-cols-6 gap-10">
                <div className="col-span-3 h-full">
                  <Card 
                    styleVarient="workflow-card" 
                    image={Logo} order={4}
                    title="No coding required"
                    context="Your business changes all the time, and your website should too. Make updates whenever you need to without touching code. Change what you want whenever you want."
                  />
                </div>
                <div className="col-span-3">
                  <Card
                    styleVarient="workflow-card"
                    image={Logo}
                    order={5}
                    title="Secured account access"
                    context="Only authorized users can access and manage your business dashboard. Your business information stays private and under your control."/>
                </div>
              </div>
            </div>
          </section>

          {/* Feature section */}
          <section className="px-3 border">
            <div className="max-auto max-w-[1200px] flex flex-col gap-5">
              <h3 className="text-center">What you can with it</h3>
              <Card
                styleVarient="media-card"
                image={Logo}
                flow="left"
                title="Organize your products"
                context="Create categories and subcategories to keep your products organized. Whether you have five items or hundreds, customers can quickly find what they're looking for."
              />
              <Card
                styleVarient="media-card"
                image={Logo}
                flow="right"
                title="Product image management"
                context="Upload, replace, and organize product images directly from your dashboard. Keep your website looking fresh without editing a single line of code."
              />
              <Card
                styleVarient="media-card"
                image={Logo}
                flow="left"
                title="Multiple business locations"
                context="Manage multiple store locations with their own addresses"
              />
            </div>
          </section>
        </main>

        {/* Footer */}
        <p>footer content</p>
      </div>
    </>
  );
}
