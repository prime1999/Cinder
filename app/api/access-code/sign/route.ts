import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import QRCode from "qrcode";

export const runtime = "nodejs";

type SignRequestBody = {
  tokenId?: string;
  eventId?: string;
  issuedAt?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body: SignRequestBody = await req.json();
    const { tokenId, eventId, issuedAt } = body;

    if (!tokenId || !eventId || !issuedAt) {
      return NextResponse.json(
        { error: "Missing tokenId, eventId, or issuedAt" },
        { status: 400 },
      );
    }

    const signerPk = process.env.ACCESS_CODE_SIGNER_PRIVATE_KEY;

    if (!signerPk) {
      return NextResponse.json(
        { error: "ACCESS_CODE_SIGNER_PRIVATE_KEY is not configured" },
        { status: 500 },
      );
    }

    const account = privateKeyToAccount(
      signerPk.startsWith("0x")
        ? (signerPk as `0x${string}`)
        : (`0x${signerPk}` as `0x${string}`),
    );

    const signature = await account.signTypedData({
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
    });

    // Construct a verification URL with payload and signature as search parameters.
    // Use the configured verification URL base, defaulting to a local path.
    const baseUrl =
      process.env.NEXT_PUBLIC_QR_VERIFICATION_URL ||
      "https://cinder.app/verify";

    // Build the full URL with search parameters for tokenId, eventId, issuedAt, and signature.
    const verificationUrl = new URL(baseUrl);
    verificationUrl.searchParams.set("tokenId", tokenId);
    verificationUrl.searchParams.set("eventId", eventId);
    verificationUrl.searchParams.set("issuedAt", issuedAt);
    verificationUrl.searchParams.set("signature", signature);

    // Encode the verification URL into the QR code instead of JSON data.
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl.toString(), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 512,
    });

    // Store the payload and signature for reference (optional).
    const qrData = {
      payload: {
        tokenId,
        eventId,
        issuedAt,
      },
      signature,
    };

    return NextResponse.json({
      signature,
      signer: account.address,
      qrData,
      qrCodeDataUrl,
    });
  } catch (error: any) {
    console.error("Failed to sign access code payload:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to sign access code payload" },
      { status: 500 },
    );
  }
}
