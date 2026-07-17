/**
 * Product / network config (public). Not secrets.
 * Redeploy a new contract → change VAULT_ADDRESS here.
 */

export const APP_CONFIG = {
  /** Active network: "testnet" | "mainnet" */
  network: "mainnet" as "testnet" | "mainnet",

  testnet: {
    chainId: 10143,
    name: "Monad Testnet",
    rpcUrl: "https://testnet-rpc.monad.xyz",
    explorerUrl: "https://testnet.monadvision.com",
    /** Deployed SecretVault (testnet) */
    vaultAddress: "0xF4c908b91876a3fa839c1457f4eEfD119ED6901C" as `0x${string}`,
  },

  mainnet: {
    chainId: 143,
    name: "Monad",
    rpcUrl: "https://rpc.monad.xyz",
    explorerUrl: "https://monadvision.com",
    /** Deployed SecretVault (mainnet) */
    vaultAddress: "0xF4c908b91876a3fa839c1457f4eEfD119ED6901C" as `0x${string}`,
  },
} as const;

export function getNetworkConfig() {
  return APP_CONFIG.network === "mainnet"
    ? APP_CONFIG.mainnet
    : APP_CONFIG.testnet;
}
