import Image from "next/image";
import Logo from "../../public/logo.svg";

export default function Home() {
  return (
    <div>
      <main>
        <h1>Admin Dashboard</h1>

        <Image
          src={Logo}
          alt="Platform logo"
          width={100}
          height={100}
          loading="eager"
          priority
        />
      </main>
    </div>
  );
}
