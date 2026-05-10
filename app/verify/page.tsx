"use client";

import Image from "next/image";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VerifyContent from "./verify-content";

const VerifyPage = () => {
  return (
    <main className="relative min-h-screen w-screen overflow-hidden">
      {/* Background image layer. */}
      <Image
        src="/images/background.jpg"
        alt="Background"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* Dark overlay on top of background for readability. */}
      <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/15 to-black/20" />

      {/* Main content section with relative positioning for overlay effect. */}
      <section className="relative z-10 min-h-screen px-6 flex flex-col">
        {/* Navbar component for navigation. */}
        <Navbar />

        {/* Centered content area that fills the remaining vertical space. */}
        <div className="flex flex-1 items-center justify-center">
          <Suspense fallback={<VerifyContent loadingOnly />}>
            <VerifyContent />
          </Suspense>
        </div>

        {/* Footer component at the bottom. */}
        <Footer />
      </section>
    </main>
  );
};

export default VerifyPage;
