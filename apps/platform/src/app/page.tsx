import Image from "next/image";
import Logo from "../../public/logo.svg";
import Card from "@/components/Card"
import Link from "next/link";
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer";

export default function HomePage() {
  return (
    <>
      {/* Navigation Bar */}
      <Header />

      {/* Main content */}
      <main className="">
        {/* Hero */}
        <section className="px-3">
          <div className="max-w-[1000px] grid grid-cols-2 mx-auto">
            <div className="flex flex-col justify-center gap-5">
              <h1>Your business deserves realtime data</h1>
              <p>Build a professional online presence in minutes. <strong>No code</strong>, just you and managing your business your way. Perfect for resturants, cafés, bakeries, and food trucks.</p>
              <Link
                href="/dashboard/login"
                className="w-fit rounded-lg px-6 py-3 bg-blue-500 text-white"
              >Get Started</Link>
            </div>
            <div>
              <Image 
                src={Logo}
                alt="Business platform example image"
                loading="eager"
              />
            </div>
          </div>
        </section>

        {/* Workflow cards */}
        <section className="px-3">
          <div className="max-auto max-w-[1200px] mx-auto">
            <h2 className="mb-5 text-center mb-10">How it works</h2>
            <div className="grid grid-cols-3 gap-10">
              <Card
                styleVarient="workflow-card" 
                order={1}
                image={Logo}
                title="Sign in"
                context="Sign in with your Google account to access your business dashboard. Don't have an account yet? Simply sign in and we'll create one for you."
              />
              <Card
                styleVarient="workflow-card"
                order={2}
                image={Logo}
                title="Build it"
                context="Add your categories, menu items, business hours, locations, contact information, social media, and more. Once everything is ready, your website is ready to share with your customers."/>
              <Card
                styleVarient="workflow-card"
                order={3}
                image={Logo}
                title="Manage it your way"
                context="Need to make any changes? Add a new item? Mark something as sold out or seasonal? Update your website with just a few clicks. No longer will you need to wait for someone else to make the changes."
              />
            </div>
            <div className="grid grid-cols-6 gap-10 mt-15">
              <div className="col-span-3 h-full">
                <Card 
                  styleVarient="workflow-card"
                  order={4}
                  image={Logo}
                  title="No coding required"
                  context="Your business changes all the time, and your website should too. Make updates whenever you need to without touching code. Change what you want whenever you want."
                />
              </div>
              <div className="col-span-3">
                <Card
                  styleVarient="workflow-card"
                  order={5}
                  image={Logo}
                  title="Secured account access"
                  context="Only authorized users can access and manage your business dashboard. Your business information stays private and under your control."/>
              </div>
            </div>
          </div>
        </section>

        {/* Feature section */}
        <section className="px-3" id="features">
          <div className="max-auto max-w-[1200px] mx-auto">
            <h2 className="text-center mb-10">What you can do with it</h2>
            <div className="flex flex-col gap-5">
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
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact">

        </section>
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}
