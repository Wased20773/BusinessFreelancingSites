import AuthSessionProvider from "@/components/providers/AuthSessionProvider";

export default function BusinessesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}
