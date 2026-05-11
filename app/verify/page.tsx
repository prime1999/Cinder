"use client";

export const dynamic = "force-dynamic";
import { Suspense } from "react";
import VerifyContent from "@/components/verify-content";

const Page = () => {
  return (
    <Suspense fallback={<div>Loading Verification...</div>}>
      <VerifyContent />
    </Suspense>
  );
};

export default Page;
