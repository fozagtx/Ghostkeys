import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  http,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";
import vaultAbi from "./SecretVault.abi.json";
import { getActiveChain, getRpcUrl, getVaultAddress } from "./chain";
import { bytesToHex, hexToBytes } from "./crypto";

const abi = vaultAbi as readonly unknown[];

export function getPublicClient() {
  return createPublicClient({
    chain: getActiveChain(),
    transport: http(getRpcUrl()),
  });
}

export function getBrowserWalletClient(account: Address): WalletClient {
  const eth = (window as unknown as { ethereum?: object }).ethereum;
  if (!eth) throw new Error("No browser wallet");
  return createWalletClient({
    account,
    chain: getActiveChain(),
    transport: custom(eth),
  });
}

export type ChainSecret = {
  index: number;
  ciphertext: Uint8Array;
  createdAt: number;
};

export async function fetchActiveSecrets(owner: Address): Promise<ChainSecret[]> {
  const client = getPublicClient();
  const vault = getVaultAddress();
  const result = (await client.readContract({
    address: vault,
    abi,
    functionName: "getActiveSecrets",
    args: [owner],
  })) as [bigint[], `0x${string}`[], bigint[]];

  const [indices, ciphertexts, createdAts] = result;
  return indices.map((idx, i) => ({
    index: Number(idx),
    ciphertext: hexToBytes(ciphertexts[i]!),
    createdAt: Number(createdAts[i]),
  }));
}

export async function addSecretOnChain(
  account: Address,
  ciphertext: Uint8Array
): Promise<Hash> {
  const wallet = getBrowserWalletClient(account);
  const vault = getVaultAddress();
  const data = encodeFunctionData({
    abi,
    functionName: "addSecret",
    args: [bytesToHex(ciphertext)],
  });
  const hash = await wallet.sendTransaction({
    account,
    chain: getActiveChain(),
    to: vault,
    data,
  });
  const publicClient = getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function deleteSecretOnChain(
  account: Address,
  index: number
): Promise<Hash> {
  const wallet = getBrowserWalletClient(account);
  const vault = getVaultAddress();
  const data = encodeFunctionData({
    abi,
    functionName: "deleteSecret",
    args: [BigInt(index)],
  });
  const hash = await wallet.sendTransaction({
    account,
    chain: getActiveChain(),
    to: vault,
    data,
  });
  await getPublicClient().waitForTransactionReceipt({ hash });
  return hash;
}

export async function ensureMonadChain(): Promise<void> {
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  if (!eth) throw new Error("No wallet");
  const chain = getActiveChain();
  const chainIdHex = `0x${chain.id.toString(16)}`;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (e) {
    const err = e as { code?: number };
    if (err.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: [chain.rpcUrls.default.http[0]],
            blockExplorerUrls: [chain.blockExplorers.default.url],
          },
        ],
      });
    } else {
      throw e;
    }
  }
}

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
