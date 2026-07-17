import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Address } from "viem";
import { getActiveChain } from "./chain";
import { ensureMonadChain } from "./vault";
import {
  unlockMessageForAddress,
  type UnlockContext,
  resolveUnlockContext,
} from "./crypto";

type WalletState = {
  address: Address | undefined;
  chainId: number | undefined;
  isConnected: boolean;
  connecting: boolean;
  wrongNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  /** Returns signature + binding context (keep in memory only). */
  signUnlock: () => Promise<{ signature: string; ctx: UnlockContext }>;
};

const WalletContext = createContext<WalletState | null>(null);

function getEthereum() {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | undefined>();
  const [chainId, setChainId] = useState<number | undefined>();
  const [connecting, setConnecting] = useState(false);
  const target = getActiveChain();

  const sync = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;
    const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
    const cid = Number((await eth.request({ method: "eth_chainId" })) as string);
    setChainId(cid);
    setAddress(accounts[0] ? (accounts[0] as Address) : undefined);
  }, []);

  useEffect(() => {
    void sync();
    const eth = getEthereum();
    if (!eth?.on) return;
    const h = () => void sync();
    eth.on("accountsChanged", h);
    eth.on("chainChanged", h);
    return () => {
      eth.removeListener?.("accountsChanged", h);
      eth.removeListener?.("chainChanged", h);
    };
  }, [sync]);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) {
      alert("Install MetaMask, Rabby, or another browser wallet");
      return;
    }
    setConnecting(true);
    try {
      await eth.request({ method: "eth_requestAccounts" });
      try {
        await ensureMonadChain();
      } catch {
        /* user may reject; still sync */
      }
      await sync();
    } finally {
      setConnecting(false);
    }
  }, [sync]);

  const disconnect = useCallback(() => {
    setAddress(undefined);
  }, []);

  const switchNetwork = useCallback(async () => {
    await ensureMonadChain();
    await sync();
  }, [sync]);

  const signUnlock = useCallback(async () => {
    const eth = getEthereum();
    if (!eth || !address) throw new Error("Connect wallet first");
    if (typeof window === "undefined") throw new Error("Browser only");

    const chain = getActiveChain();
    const currentChain = Number(
      (await eth.request({ method: "eth_chainId" })) as string
    );
    if (currentChain !== chain.id) {
      throw new Error(`Switch to ${chain.name} before unlocking`);
    }

    const ctx = resolveUnlockContext(address);
    const msg = unlockMessageForAddress(address);

    // personal_sign: [message, address]
    const signature = (await eth.request({
      method: "personal_sign",
      params: [msg, address],
    })) as string;

    return { signature, ctx };
  }, [address]);

  const wrongNetwork = Boolean(chainId && chainId !== target.id);

  const value = useMemo(
    () => ({
      address,
      chainId,
      isConnected: Boolean(address),
      connecting,
      wrongNetwork,
      connect,
      disconnect,
      switchNetwork,
      signUnlock,
    }),
    [
      address,
      chainId,
      connecting,
      wrongNetwork,
      connect,
      disconnect,
      switchNetwork,
      signUnlock,
    ]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet outside provider");
  return ctx;
}
