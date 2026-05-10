import Image from "next/image";
// UI-imports
import Navbar from "@/components/Navbar";
import GenerateCodeDialog from "@/components/GenerateCodeDialog";
import Footer from "@/components/Footer";
import TicketSheet from "@/components/TicketSheet";

const Page = () => {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <Image
        src="/images/background.jpg"
        alt="Background"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/15 to-black/20" />
      <section className="relative z-10 h-full px-6">
        <Navbar />
        <div className="flex h-full items-center justify-center ">
          <div className="mx-auto max-w-3xl text-center text-green-800 font-poppins">
            <p className="mb-4 inline-block rounded-full font-semibold font-playwrite border border-green-700/35 bg-green-700/10 px-4 py-2 text-[12px] tracking-[0.22em] backdrop-blur-sm">
              Welcome to Cinder
            </p>
            <h1 className="text-4xl font-bold font-fjallaOne leading-tight sm:text-5xl md:text-6xl">
              Secure Entry with Non-Fungible Access
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-xs text-green-900 sm:text-base">
              Secure your entry with Cinder blockchain-backed ticketing.
              Purchase NFT passes with USDC and unlock exclusive access by using
              your token to get a QR code to scan at the event entry.
            </p>

            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <TicketSheet />
              <GenerateCodeDialog />
            </div>
            <Footer />
          </div>
        </div>
      </section>
    </main>
  );
};

export default Page;
