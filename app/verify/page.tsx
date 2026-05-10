import { Suspense } from "react";
import VerifyContent from "./verify-content";

const VerifyPage = () => {
  return (
    <Suspense fallback={<VerifyContent loadingOnly />}>
      <VerifyContent />
    </Suspense>
  );
};

export default VerifyPage;
