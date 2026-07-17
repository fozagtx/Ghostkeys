"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Snippet,
  cn,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { Providers } from "./Providers";
import { ConnectButton } from "./ConnectButton";
import SecretCodeCard from "./SecretCodeCard";
import { BrandMark } from "./BrandMark";
import { useWallet } from "../lib/wallet";
import {
  decryptPayload,
  encryptPayload,
  parseOtpauthUri,
  type SecretPayload,
  type UnlockContext,
} from "../lib/crypto";
import { cleanSecret, generateTotp } from "../lib/totp";
import {
  addSecretOnChain,
  deleteSecretOnChain,
  fetchActiveSecrets,
  type ChainSecret,
} from "../lib/vault";
import {
  getActiveChain,
  getVaultAddress,
  isVaultConfigured,
} from "../lib/chain";

type DecryptedRow = {
  index: number;
  createdAt: number;
  payload: SecretPayload;
  token: string;
  remaining: number;
};

type AppView = "codes" | "add";

const NAV: { id: AppView; label: string; icon: string }[] = [
  { id: "codes", label: "Codes", icon: "solar:shield-keyhole-bold-duotone" },
  { id: "add", label: "Add", icon: "solar:add-circle-bold-duotone" },
];

/** App UI after wallet is connected. */
export function VaultInner() {
  const {
    address,
    isConnected,
    wrongNetwork,
    signUnlock,
    connect,
    switchNetwork,
  } = useWallet();

  const [session, setSession] = useState<{
    signature: string;
    ctx: UnlockContext;
  } | null>(null);
  const [rows, setRows] = useState<DecryptedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<AppView>("codes");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [form, setForm] = useState({
    service: "",
    account: "",
    secret: "",
    otpauth: "",
  });

  const vaultOk = isVaultConfigured();
  const chain = getActiveChain();
  const unlocked = Boolean(session);

  useEffect(() => {
    setSession(null);
    setRows([]);
    setView("codes");
  }, [address, wrongNetwork]);

  /** Only runs when the user clicks — never auto-pop the wallet. */
  const unlock = useCallback(async () => {
    setErr(null);
    setUnlocking(true);
    try {
      const { signature, ctx } = await signUnlock();
      setSession({ signature, ctx });
      setView("codes");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign rejected");
    } finally {
      setUnlocking(false);
    }
  }, [signUnlock]);

  const lock = () => {
    setSession(null);
    setRows([]);
    setView("codes");
  };

  const go = (next: AppView) => {
    setView(next);
    setMobileOpen(false);
  };

  const load = useCallback(async () => {
    if (!address || !session || !vaultOk) {
      setRows([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const chainSecrets: ChainSecret[] = await fetchActiveSecrets(address);
      const decrypted: DecryptedRow[] = [];
      for (const s of chainSecrets) {
        try {
          const payload = await decryptPayload(
            s.ciphertext,
            session.signature,
            session.ctx
          );
          const { token, remaining } = generateTotp(cleanSecret(payload.secret));
          decrypted.push({
            index: s.index,
            createdAt: s.createdAt,
            payload,
            token,
            remaining,
          });
        } catch {
          decrypted.push({
            index: s.index,
            createdAt: s.createdAt,
            payload: {
              v: 1,
              service: "(cannot decrypt)",
              account: "stored with older unlock or another site",
              secret: "",
            },
            token: "------",
            remaining: 0,
          });
        }
      }
      setRows(decrypted);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load codes");
    } finally {
      setLoading(false);
    }
  }, [address, session, vaultOk]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!session || rows.length === 0) return;
    const t = setInterval(() => {
      setRows((prev) =>
        prev.map((r) => {
          if (!r.payload.secret) return r;
          try {
            const { token, remaining } = generateTotp(
              cleanSecret(r.payload.secret)
            );
            return { ...r, token, remaining };
          } catch {
            return r;
          }
        })
      );
    }, 1000);
    return () => clearInterval(t);
  }, [session, rows.length]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!address || !session) return;
    setBusy(true);
    setErr(null);
    try {
      let payload: SecretPayload = {
        v: 1,
        service: form.service.trim() || "App",
        account: form.account.trim() || "default",
        secret: cleanSecret(form.secret),
      };
      if (form.otpauth.trim()) {
        const parsed = parseOtpauthUri(form.otpauth.trim());
        if (!parsed?.secret) throw new Error("Invalid otpauth URI");
        payload = {
          v: 1,
          service: parsed.service || payload.service,
          account: parsed.account || payload.account,
          secret: cleanSecret(parsed.secret),
          issuer: parsed.issuer,
        };
      }
      if (!payload.secret) throw new Error("Secret required");
      generateTotp(payload.secret);

      const ct = await encryptPayload(payload, session.signature, session.ctx);
      await addSecretOnChain(address, ct);
      setForm({ service: "", account: "", secret: "", otpauth: "" });
      await load();
      setView("codes");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(index: number) {
    if (!address) return;
    if (!confirm("Delete this authenticator from the chain?")) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteSecretOnChain(address, index);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode(token: string) {
    try {
      await navigator.clipboard.writeText(token.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  // ——— Pre-app gates: no sidebar, no fake locked chrome ———
  if (!vaultOk) {
    return (
      <GateShell>
        <Card className="w-full max-w-md border-small border-warning-500" shadow="sm">
          <CardHeader className="flex flex-col items-start gap-1 px-5 pt-5">
            <p className="text-large font-medium">Not configured</p>
            <p className="text-small text-default-500">
              Set vaultAddress in src/lib/config.ts after deploy.
            </p>
          </CardHeader>
          <CardBody className="px-5 pb-5">
            <Snippet symbol="bordered" className="w-full" hideSymbol>
              web/src/lib/config.ts
            </Snippet>
          </CardBody>
        </Card>
      </GateShell>
    );
  }

  if (!isConnected) {
    return (
      <GateShell>
        <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
          <BrandMark size={56} framed />
          <div>
            <h1 className="text-xl font-semibold text-default-900">GhostKeys</h1>
            <p className="mt-1 text-small text-default-500">
              Connect a wallet on {chain.name} to continue.
            </p>
          </div>
          <Button
            color="primary"
            radius="full"
            size="lg"
            className="w-full"
            startContent={<Icon icon="solar:wallet-bold" width={18} />}
            onPress={() => void connect()}
          >
            Connect wallet
          </Button>
        </div>
      </GateShell>
    );
  }

  if (wrongNetwork) {
    return (
      <GateShell>
        <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
          <BrandMark size={56} framed />
          <div>
            <h1 className="text-xl font-semibold text-default-900">Wrong network</h1>
            <p className="mt-1 text-small text-default-500">
              Switch to {chain.name} (id {chain.id}).
            </p>
          </div>
          <Button
            color="warning"
            radius="full"
            size="lg"
            className="w-full"
            startContent={
              <Icon icon="solar:transfer-horizontal-bold" width={18} />
            }
            onPress={() => void switchNetwork()}
          >
            Switch network
          </Button>
          <ConnectButton />
        </div>
      </GateShell>
    );
  }

  if (!unlocked) {
    return (
      <GateShell>
        <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
          <BrandMark size={64} framed />
          <div>
            <h1 className="text-xl font-semibold text-default-900">GhostKeys</h1>
            <p className="mt-1 text-small text-default-500">
              Approve the signature in your wallet to open your codes.
            </p>
          </div>
          {err && (
            <p className="w-full rounded-medium border border-danger-200 bg-danger-50 px-3 py-2 text-small text-danger">
              {err}
            </p>
          )}
          <Button
            color="primary"
            radius="full"
            size="lg"
            className="w-full"
            isLoading={unlocking}
            startContent={
              !unlocking ? (
                <Icon icon="solar:pen-new-square-bold" width={18} />
              ) : undefined
            }
            onPress={() => void unlock()}
          >
            {unlocking ? "Check your wallet…" : "Open GhostKeys"}
          </Button>
          <ConnectButton />
        </div>
      </GateShell>
    );
  }

  // ——— Unlocked app shell ———
  const pageTitle = view === "add" ? "Add account" : "Codes";
  const pageSub =
    view === "add"
      ? "Store a new 2FA secret on Monad"
      : loading
        ? "Loading…"
        : `${rows.length} account${rows.length === 1 ? "" : "s"}`;

  const sidebarBody = (
    <>
      <div className="flex shrink-0 items-center gap-2.5">
        <BrandMark size={36} framed />
        <p className="truncate text-medium font-semibold text-default-900">
          GhostKeys
        </p>
      </div>

      <nav className="mt-6 flex flex-col gap-1" aria-label="GhostKeys">
        {NAV.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-medium px-3 py-2.5 text-left text-small font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-small"
                  : "text-default-600 hover:bg-default-100"
              )}
            >
              <Icon icon={item.icon} width={20} className="shrink-0" />
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.id === "codes" && rows.length > 0 && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-tiny tabular-nums",
                    active
                      ? "bg-primary-foreground/20"
                      : "bg-default-100 text-default-500"
                  )}
                >
                  {rows.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-default-200 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            radius="full"
            variant="bordered"
            startContent={<Icon icon="solar:refresh-linear" width={16} />}
            onPress={() => void load()}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            radius="full"
            variant="flat"
            startContent={<Icon icon="solar:lock-linear" width={16} />}
            onPress={lock}
          >
            Lock
          </Button>
        </div>
        <ConnectButton compact />
      </div>
    </>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-default-200 bg-content1 md:flex lg:w-60">
        <div className="flex h-full min-h-0 flex-col p-4">{sidebarBody}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(16rem,88vw)] flex-col border-r border-default-200 bg-content1 shadow-large">
            <div className="flex items-center justify-between border-b border-default-200 px-3 py-3">
              <div className="flex items-center gap-2">
                <BrandMark size={28} framed />
                <span className="text-small font-semibold">GhostKeys</span>
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                radius="full"
                aria-label="Close"
                onPress={() => setMobileOpen(false)}
              >
                <Icon icon="solar:close-circle-linear" width={20} />
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
              {sidebarBody}
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-default-200 bg-content1 px-3 py-3 sm:px-5">
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            radius="full"
            className="shrink-0 md:hidden"
            aria-label="Open menu"
            onPress={() => setMobileOpen(true)}
          >
            <Icon icon="solar:hamburger-menu-linear" width={20} />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-medium font-semibold text-default-900 sm:text-large">
              {pageTitle}
            </h1>
            <p className="truncate text-tiny text-default-500">{pageSub}</p>
          </div>

          {copied && (
            <Chip size="sm" color="success" variant="flat" className="shrink-0">
              Copied
            </Chip>
          )}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-7">
            {view === "codes" && (
              <div className="flex flex-col gap-3">
                {!loading && rows.length === 0 && (
                  <Card
                    className="border-small border-dashed border-default-200 bg-content1"
                    shadow="none"
                  >
                    <CardBody className="items-center gap-3 py-14 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-default-100">
                        <Icon
                          className="text-default-400"
                          icon="solar:inbox-line-bold-duotone"
                          width={28}
                        />
                      </div>
                      <div>
                        <p className="text-medium font-medium text-default-700">
                          No codes yet
                        </p>
                        <p className="mt-1 max-w-sm text-small text-default-500">
                          Grab a real setup key from any app’s 2FA screen, store
                          it here, then copy the 6-digit code when you need it.
                        </p>
                      </div>
                      <Button
                        color="primary"
                        radius="full"
                        startContent={
                          <Icon icon="solar:add-circle-bold" width={18} />
                        }
                        onPress={() => go("add")}
                      >
                        Add your first code
                      </Button>
                    </CardBody>
                  </Card>
                )}

                {rows.map((r) => (
                  <SecretCodeCard
                    key={r.index}
                    service={r.payload.service}
                    account={r.payload.account}
                    token={r.token}
                    remaining={r.remaining}
                    disabledDelete={busy || !r.payload.secret}
                    onCopy={() => void copyCode(r.token)}
                    onDelete={() => void onDelete(r.index)}
                  />
                ))}
              </div>
            )}

            {view === "add" && (
              <Card className="border-small border-default-200" shadow="sm">
                <CardHeader className="flex flex-col items-start gap-1 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
                  <p className="text-large font-medium">Add your first code</p>
                  <p className="text-small text-default-500">
                    Use a real setup key from Discord, GitHub, Google, or any app
                    with authenticator 2FA.
                  </p>
                </CardHeader>
                <CardBody className="flex flex-col gap-4 px-5 pb-5 sm:px-6 sm:pb-6">
                  <ol className="list-decimal space-y-2 rounded-medium border border-default-200 bg-default-50 px-4 py-3 pl-8 text-small text-default-600">
                    <li>
                      Open the site you want to protect (start with something low
                      risk if you prefer).
                    </li>
                    <li>
                      Go to{" "}
                      <span className="font-medium text-default-800">
                        Security → Two-factor / Authenticator app
                      </span>{" "}
                      (not SMS).
                    </li>
                    <li>
                      Choose{" "}
                      <span className="font-medium text-default-800">
                        can’t scan QR / show key / manual entry
                      </span>{" "}
                      and copy that long key.
                    </li>
                    <li>
                      Paste it below as the setup key. Label the service and
                      account so you recognize it later.
                    </li>
                    <li>
                      Hit store and confirm the gas transaction in your wallet.
                      Then open Codes and copy the 6-digit number when a site
                      asks for it.
                    </li>
                  </ol>
                  <p className="text-tiny text-default-400">
                    Encryption happens in your browser. Storing costs ~0.03{" "}
                    {chain.nativeCurrency.symbol} gas on {chain.name}. If your
                    wallet will not confirm, you likely need testnet MON from{" "}
                    <a
                      className="font-medium text-primary underline"
                      href="https://faucet.monad.xyz"
                      target="_blank"
                      rel="noreferrer"
                    >
                      faucet.monad.xyz
                    </a>
                    .
                  </p>

                  <form
                    className="flex flex-col gap-4"
                    onSubmit={(e) => void onAdd(e)}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Service"
                        placeholder="e.g. Discord"
                        variant="bordered"
                        value={form.service}
                        onValueChange={(v) =>
                          setForm({ ...form, service: v })
                        }
                      />
                      <Input
                        label="Account"
                        placeholder="e.g. your@email.com"
                        variant="bordered"
                        value={form.account}
                        onValueChange={(v) =>
                          setForm({ ...form, account: v })
                        }
                      />
                    </div>
                    <Input
                      label="Setup key"
                      description="The long secret from manual entry (letters and numbers)"
                      placeholder="Paste setup key"
                      variant="bordered"
                      classNames={{ input: "font-mono" }}
                      value={form.secret}
                      onValueChange={(v) => setForm({ ...form, secret: v })}
                      autoComplete="off"
                      isRequired
                    />
                    <Input
                      label="Or otpauth link (optional)"
                      description="Only if you already have a link starting with otpauth://totp/"
                      placeholder="otpauth://totp/…"
                      variant="bordered"
                      classNames={{ input: "font-mono text-tiny" }}
                      value={form.otpauth}
                      onValueChange={(v) => setForm({ ...form, otpauth: v })}
                    />
                    <Button
                      type="submit"
                      color="primary"
                      radius="full"
                      className="w-full sm:w-auto sm:self-end"
                      isLoading={busy}
                    >
                      {busy
                        ? "Confirm gas tx in wallet…"
                        : "Encrypt & store (pays gas)"}
                    </Button>
                  </form>
                </CardBody>
              </Card>
            )}

            {err && (
              <Card className="border-small border-danger-300" shadow="sm">
                <CardBody className="flex flex-row items-start gap-3 p-4">
                  <Icon
                    className="shrink-0 text-danger"
                    icon="solar:danger-circle-bold"
                    width={22}
                  />
                  <p className="text-small text-danger">{err}</p>
                </CardBody>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function GateShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-10">
      {children}
    </div>
  );
}

export function VaultApp() {
  return (
    <Providers>
      <VaultInner />
    </Providers>
  );
}
