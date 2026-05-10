import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(
  process.env.ACCESS_CODE_SIGNER_PRIVATE_KEY as `0x${string}`,
);

export const BACKEND_SIGNER_ADDRESS = account.address;
