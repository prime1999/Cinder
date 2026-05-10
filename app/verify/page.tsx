"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { recoverTypedDataAddress } from "viem";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const VerifyPage = () => {
  // searchParams holds the URL query parameters passed by the QR code.
  const searchParams = useSearchParams();

  // Extract verification data from search parameters.
  const tokenId = searchParams.get("tokenId");
  const eventId = searchParams.get("eventId");
  const issuedAt = searchParams.get("issuedAt");
  const signature = searchParams.get("signature");

  // verifyStatus tracks whether verification is pending, success, or failed.
  const [verifyStatus, setVerifyStatus] = useState<
    "pending" | "verifying" | "success" | "error"
  >("pending");

  // errorMessage stores any validation or signature verification error.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // recoveredAddress stores the wallet address that signed the access code.
  const [recoveredAddress, setRecoveredAddress] = useState<string | null>(null);

  // ticketInfo caches the ticket metadata for display.
  const [ticketInfo, setTicketInfo] = useState<any>(null);

  // Perform signature verification when component mounts or params change.
  useEffect(() => {
    // Skip verification if any required parameter is missing.
    if (!tokenId || !eventId || !issuedAt || !signature) {
      setVerifyStatus("error");
      setErrorMessage("Missing required parameters in QR code.");
      return;
    }

    // Verify the signature and mark ticket as used.
    (async () => {
      try {
        // Start the verification process.
        setVerifyStatus("verifying");
        setErrorMessage(null);

        // Recover the signer's address using the same typed data structure.
        const recovered = await recoverTypedDataAddress({
          domain: {
            name: "Cinder Access Code",
            version: "1",
          },
          types: {
            AccessCode: [
              { name: "tokenId", type: "string" },
              { name: "eventId", type: "string" },
              { name: "issuedAt", type: "string" },
            ],
          },
          primaryType: "AccessCode",
          message: {
            tokenId,
            eventId,
            issuedAt,
          },
          signature: signature as `0x${string}`,
        });

        // Store the recovered signer address.
        setRecoveredAddress(recovered);

        // Call the backend to verify and mark the ticket as used.
        const verifyRes = await fetch("/api/access-code/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tokenId,
            eventId,
            issuedAt,
            signature,
            signerAddress: recovered,
          }),
        });

        const verifyBody = await verifyRes.json().catch(() => null);

        // If verification fails, display the backend error.
        if (!verifyRes.ok) {
          // Include both error and message for better context.
          const errorMsg = verifyBody?.message || verifyBody?.error || "Failed to verify access code.";
          throw new Error(errorMsg);
        }

        // Store ticket information for display (from backend response).
        if (verifyBody?.ticketInfo) {
          setTicketInfo(verifyBody.ticketInfo);
        }

        // Mark verification as successful.
        setVerifyStatus("success");
      } catch (err: any) {
        console.log({ err });
        // Surface verification errors to the user.
        setVerifyStatus("error");
        setErrorMessage(
          err?.message ?? "Failed to verify access code signature.",
        );
      }
    })();
  }, [tokenId, eventId, issuedAt, signature]);

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
          <div className="mx-auto max-w-2xl text-center text-green-800 font-poppins">
            {/* Status badge. */}
            <p className="mb-4 inline-block rounded-full font-semibold font-playwrite border border-green-700/35 bg-green-700/10 px-4 py-2 text-[12px] tracking-[0.22em] backdrop-blur-sm">
              {verifyStatus === "pending" && "LOADING ACCESS CODE"}
              {verifyStatus === "verifying" && "VERIFYING SIGNATURE"}
              {verifyStatus === "success" && "✓ VERIFIED"}
              {verifyStatus === "error" && "✗ VERIFICATION FAILED"}
            </p>

            {/* Dynamic heading based on verification status. */}
            <h1 className="text-3xl font-bold font-fjallaOne leading-tight sm:text-4xl md:text-5xl">
              {verifyStatus === "pending" && "Loading Access Code"}
              {verifyStatus === "verifying" && "Verifying Your Access Code..."}
              {verifyStatus === "success" && "Access Code Verified"}
              {verifyStatus === "error" && "Verification Failed"}
            </h1>

            {/* Success state: Display verified ticket information. */}
            {verifyStatus === "success" && (
              <div className="mt-8 space-y-4 text-left">
                {/* Verified message. */}
                <p className="mx-auto max-w-xl text-base text-green-900">
                  Your access code has been successfully verified. Please
                  present this confirmation at the event entrance.
                </p>

                {/* Ticket information display. */}
                <div className="mx-auto max-w-xl rounded-lg border border-green-700/35 bg-green-700/10 p-4 space-y-2 backdrop-blur-sm">
                  {/* Token ID. */}
                  <div>
                    <span className="font-semibold text-green-800">
                      Token ID:
                    </span>{" "}
                    <span className="text-green-900">{tokenId}</span>
                  </div>

                  {/* Event ID. */}
                  <div>
                    <span className="font-semibold text-green-800">
                      Event ID:
                    </span>{" "}
                    <span className="text-green-900">{eventId}</span>
                  </div>

                  {/* Issue timestamp. */}
                  <div>
                    <span className="font-semibold text-green-800">
                      Issued At:
                    </span>{" "}
                    <span className="text-green-900">
                      {issuedAt
                        ? new Date(issuedAt).toLocaleString()
                        : "Unknown"}
                    </span>
                  </div>

                  {/* Signer address (recovered from signature). */}
                  {recoveredAddress && (
                    <div>
                      <span className="font-semibold text-green-800">
                        Verified By:
                      </span>{" "}
                      <span className="text-xs text-green-900 break-all">
                        {recoveredAddress}
                      </span>
                    </div>
                  )}

                  {/* Additional ticket info if provided by backend. */}
                  {ticketInfo && (
                    <>
                      {ticketInfo.eventName && (
                        <div>
                          <span className="font-semibold text-green-800">
                            Event:
                          </span>{" "}
                          <span className="text-green-900">
                            {ticketInfo.eventName}
                          </span>
                        </div>
                      )}
                      {ticketInfo.used && (
                        <div>
                          <span className="font-semibold text-amber-700">
                            Used At:
                          </span>{" "}
                          <span className="text-amber-900">
                            {new Date(ticketInfo.usedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Success instruction for event staff. */}
                <p className="mx-auto max-w-xl text-sm text-green-700 font-semibold">
                  ✓ Please allow this guest entry to the event.
                </p>
              </div>
            )}

            {/* Error state: Display error message. */}
            {verifyStatus === "error" && (
              <div className="mt-8 space-y-4">
                {/* Error message. */}
                <p className="mx-auto max-w-xl text-base text-red-700">
                  {errorMessage || "An unexpected error occurred."}
                </p>

                {/* Display parameters for debugging (if available). */}
                {(tokenId || eventId || issuedAt || signature) && (
                  <div className="mx-auto max-w-xl rounded-lg border border-red-700/35 bg-red-700/10 p-4 space-y-2 backdrop-blur-sm text-left">
                    <p className="text-xs font-semibold text-red-800">
                      Debug Info:
                    </p>
                    {tokenId && (
                      <p className="text-xs text-red-900 break-all">
                        Token ID: {tokenId}
                      </p>
                    )}
                    {eventId && (
                      <p className="text-xs text-red-900 break-all">
                        Event ID: {eventId}
                      </p>
                    )}
                    {issuedAt && (
                      <p className="text-xs text-red-900 break-all">
                        Issued At: {issuedAt}
                      </p>
                    )}
                  </div>
                )}

                {/* Retry button to go back to home. */}
                <Button
                  onClick={() => (window.location.href = "/")}
                  className="mt-4"
                >
                  Back to Home
                </Button>
              </div>
            )}

            {/* Loading state: Show spinner or message. */}
            {(verifyStatus === "pending" || verifyStatus === "verifying") && (
              <div className="mt-8">
                <p className="text-base text-green-900">
                  {verifyStatus === "verifying"
                    ? "Please wait while we verify your signature..."
                    : "Loading your access code..."}
                </p>
                <div className="mt-4 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-700/30 border-t-green-700"></div>
                </div>
              </div>
            )}

            {/* Footer component at the bottom. */}
            <div className="mt-12">
              <Footer />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default VerifyPage;
