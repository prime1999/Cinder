import Image from "next/image";
// UI-imports
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/20" />
      <section className="relative z-10 h-full px-6">
        <Navbar />
        <div className="flex h-full items-center justify-center ">
          <div className="mx-auto max-w-3xl text-center text-white">
            <p className="mb-4 inline-block rounded-full border border-white/35 bg-white/10 px-4 py-1 text-xs tracking-[0.22em] uppercase backdrop-blur-sm sm:text-sm">
              Welcome to Cinder
            </p>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
              Explore Beyond The Ordinary
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/90 sm:text-base md:text-lg">
              A full-page visual experience built around your featured image,
              designed to feel bold on desktop and clear on mobile.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button className="w-52 rounded-full bg-amber-300 px-6 py-3 text-sm font-bold text-zinc-900 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 sm:text-base">
                Get Started
              </button>
              <button className="w-52 rounded-full border border-white/60 bg-black/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-base">
                Learn More
              </button>
            </div>
            <Footer />
          </div>
        </div>
      </section>
    </main>
  );
};

export default Page;
