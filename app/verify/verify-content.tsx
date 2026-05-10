"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { recoverTypedDataAddress } from "viem";
import { Button } from "@/components/ui/button";

type VerifyContentProps = {
  loadingOnly?: boolean;
};

const VerifyContent = ({ loadingOnly = false }: VerifyContentProps) => {
  const searchParams = useSearchParams();

  const tokenId = searchParams.get("tokenId");
  const eventId = searchParams.get("eventId");
  const issuedAt = searchParams.get("issuedAt");
  const signature = searchParams.get("signature");

  const [verifyStatus, setVerifyStatus] = useState<
    "pending" | "verifying" | "success" | "error"
  >("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveredAddress, setRecoveredAddress] = useState<string | null>(null);
  const [ticketInfo, setTicketInfo] = useState<any>(null);

  useEffect(() => {
    if (!tokenId || !eventId || !issuedAt || !signature) {
      setVerifyStatus("error");
      setErrorMessage("Missing required parameters in QR code.");
      return;
    }

    (async () => {
      try {
        setVerifyStatus("verifying");
        setErrorMessage(null);

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

        setRecoveredAddress(recovered);

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

        if (!verifyRes.ok) {
          const errorMsg =
            verifyBody?.message ||
            verifyBody?.error ||
            "Failed to verify access code.";
          throw new Error(errorMsg);
        }

        if (verifyBody?.ticketInfo) {
          setTicketInfo(verifyBody.ticketInfo);
        }

        setVerifyStatus("success");
      } catch (err: any) {
        setVerifyStatus("error");
        setErrorMessage(
          err?.message ?? "Failed to verify access code signature.",
        );
      }
    })();
  }, [tokenId, eventId, issuedAt, signature]);

  if (loadingOnly) {
    return (
      <div className="mx-auto max-w-2xl text-center text-green-800 font-poppins">
        <p className="mb-4 inline-block rounded-full font-semibold font-playwrite border border-green-700/35 bg-green-700/10 px-4 py-2 text-[12px] tracking-[0.22em] backdrop-blur-sm">
          LOADING ACCESS CODE
        </p>

        <h1 className="text-3xl font-bold font-fjallaOne leading-tight sm:text-4xl md:text-5xl">
          Loading your access code...
        </h1>

        <div className="mt-8">
          <p className="text-base text-green-900">
            Please wait while we verify your signature...
          </p>
          <div className="mt-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-700/30 border-t-green-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl text-center text-green-800 font-poppins">
      <p className="mb-4 inline-block rounded-full font-semibold font-playwrite border border-green-700/35 bg-green-700/10 px-4 py-2 text-[12px] tracking-[0.22em] backdrop-blur-sm">
        {verifyStatus === "pending" && "LOADING ACCESS CODE"}
        {verifyStatus === "verifying" && "VERIFYING SIGNATURE"}
        {verifyStatus === "success" && "✓ VERIFIED"}
        {verifyStatus === "error" && "✗ VERIFICATION FAILED"}
      </p>

      <h1 className="text-3xl font-bold font-fjallaOne leading-tight sm:text-4xl md:text-5xl">
        {verifyStatus === "pending" && "Loading Access Code"}
        {verifyStatus === "verifying" && "Verifying Your Access Code..."}
        {verifyStatus === "success" && "Access Code Verified"}
        {verifyStatus === "error" && "Verification Failed"}
      </h1>

      {verifyStatus === "success" && (
        <div className="mt-8 space-y-4 text-left">
          <p className="mx-auto max-w-xl text-base text-green-900">
            Your access code has been successfully verified. Please present this
            confirmation at the event entrance.
          </p>

          <div className="mx-auto max-w-xl rounded-lg border border-green-700/35 bg-green-700/10 p-4 space-y-2 backdrop-blur-sm">
            <div>
              <span className="font-semibold text-green-800">Token ID:</span>{" "}
              <span className="text-green-900">{tokenId}</span>
            </div>

            <div>
              <span className="font-semibold text-green-800">Event ID:</span>{" "}
              <span className="text-green-900">{eventId}</span>
            </div>

            <div>
              <span className="font-semibold text-green-800">Issued At:</span>{" "}
              <span className="text-green-900">
                {issuedAt ? new Date(issuedAt).toLocaleString() : "Unknown"}
              </span>
            </div>

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

            {ticketInfo && (
              <>
                {ticketInfo.eventName && (
                  <div>
                    <span className="font-semibold text-green-800">Event:</span>{" "}
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

          <p className="mx-auto max-w-xl text-sm text-green-700 font-semibold">
            ✓ Please allow this guest entry to the event.
          </p>
        </div>
      )}

      {verifyStatus === "error" && (
        <div className="mt-8 space-y-4">
          <p className="mx-auto max-w-xl text-base text-red-700">
            {errorMessage || "An unexpected error occurred."}
          </p>

          {(tokenId || eventId || issuedAt || signature) && (
            <div className="mx-auto max-w-xl rounded-lg border border-red-700/35 bg-red-700/10 p-4 space-y-2 backdrop-blur-sm text-left">
              <p className="text-xs font-semibold text-red-800">Debug Info:</p>
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

          <Button onClick={() => (window.location.href = "/")} className="mt-4">
            Back to Home
          </Button>
        </div>
      )}

      {(verifyStatus === "pending" || verifyStatus === "verifying") &&
        !loadingOnly && (
          <div className="mt-8">
            <p className="text-base text-green-900">
              {verifyStatus === "verifying"
                ? "Please wait while we verify your signature..."
                : "Loading your access code..."}
            </p>
            <div className="mt-4 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-700/30 border-t-green-700" />
            </div>
          </div>
        )}
    </div>
  );
};

export default VerifyContent;
