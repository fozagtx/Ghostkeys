/**
 * Product / network config (public). Not secrets.
 * Redeploy a new contract → change VAULT_ADDRESS here.
 */

export const APP_CONFIG = {
  /** Active network: "testnet" | "mainnet" */
  network: "testnet" as "testnet" | "mainnet",

  testnet: {
    chainId: 10143,
    name: "Monad Testnet",
    rpcUrl: "https://testnet-rpc.monad.xyz",
    explorerUrl: "https://testnet.monadvision.com",
    /** Deployed SecretVault */
    vaultAddress: "0xF4c908b91876a3fa839c1457f4eEfD119ED6901C" as `0x${string}`,
  },

  mainnet: {
    chainId: 143,
    name: "Monad",
    rpcUrl: "https://rpc.monad.xyz",
    explorerUrl: "https://monadvision.com",
    /** Set after mainnet deploy */
    vaultAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
} as const;

export function getNetworkConfig() {
  return APP_CONFIG.network === "mainnet"
    ? APP_CONFIG.mainnet
    : APP_CONFIG.testnet;
}
