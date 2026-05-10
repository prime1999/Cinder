"use client";

import { Suspense } from "react";
import VerifyContent from "@/components/verify-content";

const Page = () => {
  return (
    <Suspense fallback={<VerifyContent loadingOnly />}>
      <VerifyContent />
    </Suspense>
  );
};

export default Page;
