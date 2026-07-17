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
  /**
   * Only true after the user clicks Connect (or we already have an intentional session).
   * Silent eth_accounts on load does NOT auto-connect the app.
   */
  const [sessionActive, setSessionActive] = useState(false);
  const target = getActiveChain();

  const readChainId = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;
    try {
      const cid = Number((await eth.request({ method: "eth_chainId" })) as string);
      setChainId(cid);
    } catch {
      /* ignore */
    }
  }, []);

  const syncAccounts = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;
    try {
      const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
      const cid = Number((await eth.request({ method: "eth_chainId" })) as string);
      setChainId(cid);
      if (!sessionActive) {
        // Do not attach a wallet until the user clicks Connect
        return;
      }
      if (!accounts[0]) {
        setAddress(undefined);
        setSessionActive(false);
        return;
      }
      setAddress(accounts[0] as Address);
    } catch {
      /* ignore */
    }
  }, [sessionActive]);

  // Track chain only on mount; never auto-attach accounts
  useEffect(() => {
    void readChainId();
  }, [readChainId]);

  useEffect(() => {
    const eth = getEthereum();
    if (!eth?.on) return;

    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      if (!list?.[0]) {
        setAddress(undefined);
        setSessionActive(false);
        return;
      }
      // Only adopt account changes if user already connected in this session
      if (sessionActive) {
        setAddress(list[0] as Address);
      }
    };
    const onChain = () => void readChainId();

    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [readChainId, sessionActive]);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) {
      alert("Install MetaMask, Rabby, or another browser wallet");
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      try {
        await ensureMonadChain();
      } catch {
        /* user may reject; still continue */
      }
      const cid = Number((await eth.request({ method: "eth_chainId" })) as string);
      setChainId(cid);
      if (accounts[0]) {
        setAddress(accounts[0] as Address);
        setSessionActive(true);
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(undefined);
    setSessionActive(false);
  }, []);

  const switchNetwork = useCallback(async () => {
    await ensureMonadChain();
    await readChainId();
    await syncAccounts();
  }, [readChainId, syncAccounts]);

  const signUnlock = useCallback(async () => {
    const eth = getEthereum();
    if (!eth || !address) throw new Error("Connect wallet first");
    if (typeof window === "undefined") throw new Error("Browser only");

    const chain = getActiveChain();
    const currentChain = Number(
      (await eth.request({ method: "eth_chainId" })) as string
    );
    if (currentChain !== chain.id) {
      throw new Error(`Switch to ${chain.name} before continuing`);
    }

    const ctx = resolveUnlockContext(address);
    const msg = unlockMessageForAddress(address);

    const signature = (await eth.request({
      method: "personal_sign",
      params: [msg, address],
    })) as string;

    return { signature, ctx };
  }, [address]);

  const wrongNetwork = Boolean(
    sessionActive && chainId && chainId !== target.id
  );

  const value = useMemo(
    () => ({
      address,
      chainId,
      isConnected: Boolean(sessionActive && address),
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
      sessionActive,
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
