import { defineChain } from "viem";
import { APP_CONFIG, getNetworkConfig } from "./config";

export const monadTestnet = defineChain({
  id: APP_CONFIG.testnet.chainId,
  name: APP_CONFIG.testnet.name,
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [APP_CONFIG.testnet.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: APP_CONFIG.testnet.explorerUrl },
  },
});

export const monadMainnet = defineChain({
  id: APP_CONFIG.mainnet.chainId,
  name: APP_CONFIG.mainnet.name,
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [APP_CONFIG.mainnet.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: APP_CONFIG.mainnet.explorerUrl },
  },
});

export function getActiveChain() {
  return APP_CONFIG.network === "mainnet" ? monadMainnet : monadTestnet;
}

export function getRpcUrl() {
  return getNetworkConfig().rpcUrl;
}

export function getVaultAddress(): `0x${string}` {
  return getNetworkConfig().vaultAddress;
}

export function isVaultConfigured() {
  return (
    getVaultAddress() !== "0x0000000000000000000000000000000000000000"
  );
}
