import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://testnet.monadvision.com" },
  },
});

export const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://monadvision.com" },
  },
});

/** Prefer mainnet if env says so; default testnet for free deploy/demo. */
export function getActiveChain() {
  const id = Number(import.meta.env.PUBLIC_CHAIN_ID ?? "10143");
  return id === 143 ? monadMainnet : monadTestnet;
}

export function getRpcUrl() {
  return (
    import.meta.env.PUBLIC_MONAD_RPC ??
    getActiveChain().rpcUrls.default.http[0]
  );
}

export function getVaultAddress(): `0x${string}` {
  const a = import.meta.env.PUBLIC_VAULT_ADDRESS as string | undefined;
  if (a && /^0x[a-fA-F0-9]{40}$/.test(a)) return a as `0x${string}`;
  return "0x0000000000000000000000000000000000000000";
}

export function isVaultConfigured() {
  return getVaultAddress() !== "0x0000000000000000000000000000000000000000";
}
