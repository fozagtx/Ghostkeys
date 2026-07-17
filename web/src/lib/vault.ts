import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  formatEther,
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

function walletErrorMessage(e: unknown): string {
  const any = e as {
    shortMessage?: string;
    message?: string;
    details?: string;
    cause?: { message?: string; shortMessage?: string };
  };
  const raw = [
    any?.shortMessage,
    any?.message,
    any?.details,
    any?.cause?.shortMessage,
    any?.cause?.message,
  ]
    .filter(Boolean)
    .join(" ");

  const lower = raw.toLowerCase();
  if (
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance") ||
    lower.includes("exceeds the balance")
  ) {
    return "Not enough MON for gas. Get free testnet MON from https://faucet.monad.xyz then try again.";
  }
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request")
  ) {
    return "Transaction rejected in wallet.";
  }
  if (lower.includes("nonce")) {
    return "Wallet nonce stuck. Reset account in MetaMask (Settings → Advanced → Clear activity), then retry.";
  }
  return any?.shortMessage || any?.message || "Transaction failed";
}

/** Estimate gas + fees; throw a clear error if the wallet cannot pay. */
async function prepareTx(account: Address, data: `0x${string}`) {
  const publicClient = getPublicClient();
  const vault = getVaultAddress();
  const chain = getActiveChain();

  const balance = await publicClient.getBalance({ address: account });
  const gas = await publicClient.estimateGas({
    account,
    to: vault,
    data,
  });
  // Buffer for estimate variance
  const gasLimit = (gas * 130n) / 100n;

  let maxFeePerGas: bigint | undefined;
  let maxPriorityFeePerGas: bigint | undefined;
  try {
    const fees = await publicClient.estimateFeesPerGas();
    maxFeePerGas = fees.maxFeePerGas
      ? (fees.maxFeePerGas * 120n) / 100n
      : undefined;
    maxPriorityFeePerGas = fees.maxPriorityFeePerGas
      ? (fees.maxPriorityFeePerGas * 120n) / 100n
      : undefined;
  } catch {
    /* legacy gasPrice path below */
  }

  if (!maxFeePerGas) {
    const gasPrice = await publicClient.getGasPrice();
    maxFeePerGas = (gasPrice * 120n) / 100n;
    maxPriorityFeePerGas = gasPrice / 10n;
  }

  const maxCost = gasLimit * maxFeePerGas;
  if (balance < maxCost) {
    const need = formatEther(maxCost);
    const have = formatEther(balance);
    throw new Error(
      `Not enough ${chain.nativeCurrency.symbol} for gas. Need ~${Number(need).toFixed(4)}, you have ${Number(have).toFixed(4)}. Get free testnet MON: https://faucet.monad.xyz`
    );
  }

  return {
    to: vault,
    data,
    gas: gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    chain,
  };
}

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
  try {
    const wallet = getBrowserWalletClient(account);
    const data = encodeFunctionData({
      abi,
      functionName: "addSecret",
      args: [bytesToHex(ciphertext)],
    });
    const prepared = await prepareTx(account, data);
    const hash = await wallet.sendTransaction({
      account,
      chain: prepared.chain,
      to: prepared.to,
      data: prepared.data,
      gas: prepared.gas,
      maxFeePerGas: prepared.maxFeePerGas,
      maxPriorityFeePerGas: prepared.maxPriorityFeePerGas,
    });
    await getPublicClient().waitForTransactionReceipt({ hash });
    return hash;
  } catch (e) {
    throw new Error(walletErrorMessage(e));
  }
}

export async function deleteSecretOnChain(
  account: Address,
  index: number
): Promise<Hash> {
  try {
    const wallet = getBrowserWalletClient(account);
    const data = encodeFunctionData({
      abi,
      functionName: "deleteSecret",
      args: [BigInt(index)],
    });
    const prepared = await prepareTx(account, data);
    const hash = await wallet.sendTransaction({
      account,
      chain: prepared.chain,
      to: prepared.to,
      data: prepared.data,
      gas: prepared.gas,
      maxFeePerGas: prepared.maxFeePerGas,
      maxPriorityFeePerGas: prepared.maxPriorityFeePerGas,
    });
    await getPublicClient().waitForTransactionReceipt({ hash });
    return hash;
  } catch (e) {
    throw new Error(walletErrorMessage(e));
  }
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
