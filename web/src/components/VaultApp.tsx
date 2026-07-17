"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Snippet,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { Providers } from "./Providers";
import { ConnectButton } from "./ConnectButton";
import ActionCard from "./ActionCard";
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
import { getActiveChain, isVaultConfigured } from "../lib/chain";

type DecryptedRow = {
  index: number;
  createdAt: number;
  payload: SecretPayload;
  token: string;
  remaining: number;
};

function VaultInner() {
  const {
    address,
    isConnected,
    wrongNetwork,
    signUnlock,
    connect,
    switchNetwork,
  } = useWallet();
  /** In-memory only — never localStorage */
  const [session, setSession] = useState<{
    signature: string;
    ctx: UnlockContext;
  } | null>(null);
  const [rows, setRows] = useState<DecryptedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
  }, [address, wrongNetwork]);

  const unlock = async () => {
    setErr(null);
    try {
      const { signature, ctx } = await signUnlock();
      setSession({ signature, ctx });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign rejected");
    }
  };

  const lock = () => {
    setSession(null);
    setRows([]);
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
      setErr(e instanceof Error ? e.message : "Failed to load vault");
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

      const ct = await encryptPayload(
        payload,
        session.signature,
        session.ctx
      );
      await addSecretOnChain(address, ct);
      setForm({ service: "", account: "", secret: "", otpauth: "" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(index: number) {
    if (!address) return;
    if (!confirm("Delete this secret from the on-chain vault?")) return;
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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      {/* Navbar */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-large border border-default-200 bg-content1 px-4 py-3 shadow-small">
        <div className="flex items-center gap-3">
          <a href="/" aria-label="Home" className="shrink-0">
            <BrandMark size={40} framed />
          </a>
          <p className="text-medium font-semibold text-default-900">GhostKeys</p>
        </div>
        <ConnectButton />
      </header>

      {/* Hero */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip size="sm" color="primary" variant="flat">
            Wallet-backed
          </Chip>
          <Chip size="sm" variant="flat">
            Multi-device
          </Chip>
          {unlocked && (
            <Chip size="sm" color="success" variant="flat">
              Unlocked
            </Chip>
          )}
          {copied && (
            <Chip size="sm" color="success" variant="dot">
              Copied
            </Chip>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-default-900 sm:text-3xl">
          Your authenticator, tied to your wallet
        </h1>
        <p className="max-w-xl text-small text-default-500">
          Save 2FA accounts once. Open them on any phone or laptop by connecting the same wallet.
        </p>
      </div>

      {/* Feature row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          color="primary"
          icon="solar:lock-keyhole-bold-duotone"
          title="Locked to you"
          description="Only your wallet can unlock your codes."
        />
        <ActionCard
          color="secondary"
          icon="solar:cloud-storage-bold-duotone"
          title="Doesn’t die with a phone"
          description="Accounts live with your wallet, not one device."
        />
        <ActionCard
          icon="solar:smartphone-2-bold-duotone"
          title="Works anywhere"
          description="Connect, unlock, copy the code. Done."
        />
      </div>

      {!vaultOk && (
        <Card className="border-small border-warning-500" shadow="sm">
          <CardHeader className="flex flex-col items-start gap-1 px-4 pb-0 pt-4">
            <p className="text-large font-medium">GhostKeys not configured</p>
            <p className="text-small text-default-500">
              Set PUBLIC_VAULT_ADDRESS after deploy.
            </p>
          </CardHeader>
          <CardBody className="px-4 pb-4">
            <Snippet symbol="bordered" className="w-full" hideSymbol>
              forge script … DeploySecretVault
            </Snippet>
          </CardBody>
        </Card>
      )}

      {/* Gate states */}
      {!isConnected && (
        <Card className="border-small border-default-200" shadow="sm">
          <CardBody className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-medium border border-default-100 bg-default-50 p-2">
                <Icon
                  className="text-default-500"
                  icon="solar:wallet-bold-duotone"
                  width={24}
                />
              </div>
              <div>
                <p className="text-medium font-medium">Connect to open GhostKeys</p>
                <p className="text-small text-default-500">
                  Use MetaMask or Rabby on {chain.name} (chain id {chain.id}).
                </p>
              </div>
            </div>
            <Button
              color="primary"
              radius="full"
              startContent={<Icon icon="solar:wallet-bold" width={18} />}
              onPress={() => void connect()}
            >
              Connect wallet
            </Button>
          </CardBody>
        </Card>
      )}

      {isConnected && wrongNetwork && (
        <Card className="border-small border-warning-500" shadow="sm">
          <CardBody className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-medium border border-warning-100 bg-warning-50 p-2">
                <Icon
                  className="text-warning-600"
                  icon="solar:danger-triangle-bold"
                  width={24}
                />
              </div>
              <div>
                <p className="text-medium font-medium">Wrong network</p>
                <p className="text-small text-default-500">
                  Switch MetaMask to {chain.name} (id {chain.id}) to read and write the vault.
                </p>
              </div>
            </div>
            <Button
              color="warning"
              radius="full"
              startContent={<Icon icon="solar:transfer-horizontal-bold" width={18} />}
              onPress={() => void switchNetwork()}
            >
              Switch network
            </Button>
          </CardBody>
        </Card>
      )}

      {isConnected && !wrongNetwork && !unlocked && (
        <Card className="border-small border-default-200" shadow="sm">
          <CardHeader className="flex flex-col items-start gap-1 px-6 pb-0 pt-6">
            <div className="mb-2 flex rounded-medium border border-primary-100 bg-primary-50 p-2">
              <Icon className="text-primary" icon="solar:key-bold-duotone" width={24} />
            </div>
            <p className="text-large font-medium">Unlock GhostKeys</p>
            <p className="text-small text-default-500">
              Sign a message bound to this site, network, wallet, and vault. Not a transaction. No
              gas.
            </p>
          </CardHeader>
          <CardBody className="gap-3 px-6 pb-6">
            <div className="rounded-medium border border-warning-200 bg-warning-50/80 px-4 py-3 text-small text-default-600">
              <p className="mb-1 font-medium text-default-800">Only sign on the real GhostKeys site</p>
              <ul className="list-disc space-y-1 pl-4 text-default-500">
                <li>Check the URL in your browser before signing.</li>
                <li>Unlock only works for this site and Monad network.</li>
                <li>Closing the tab or hitting Lock forgets the unlock. We do not save it on your disk.</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                color="primary"
                radius="full"
                className="w-full sm:w-auto"
                startContent={<Icon icon="solar:pen-new-square-bold" width={18} />}
                onPress={() => void unlock()}
              >
                Sign to unlock
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {isConnected && unlocked && vaultOk && (
        <>
          <Card className="border-small border-default-200" shadow="sm">
            <CardHeader className="flex flex-col items-start gap-1 px-6 pb-0 pt-6">
              <p className="text-large font-medium">Add authenticator</p>
              <p className="text-small text-default-500">
                Name the account yourself. The secret comes from the app’s 2FA setup screen, not from
                GhostKeys.
              </p>
            </CardHeader>
            <CardBody className="flex flex-col gap-4 px-6 pb-6">
              <div className="rounded-medium border border-default-200 bg-default-50 px-4 py-3">
                <p className="mb-2 text-small font-medium text-default-700">
                  Where do I get the secret?
                </p>
                <ol className="list-decimal space-y-1 pl-4 text-small text-default-500">
                  <li>
                    Open the site you want to secure (any service with an authenticator app option).
                  </li>
                  <li>
                    Go to Security → Two-factor / Authenticator app (not SMS).
                  </li>
                  <li>
                    Choose <span className="font-medium text-default-600">can’t scan QR? / show
                    key / manual entry</span> and copy that long key.
                  </li>
                  <li>
                    Paste it below as the secret. Or paste an{" "}
                    <span className="font-mono text-tiny">otpauth://</span> link if you have one.
                  </li>
                </ol>
                <p className="mt-2 text-tiny text-default-400">
                  Service and account are only labels so you can tell codes apart. GhostKeys does not
                  log into Google or any other app for you.
                </p>
              </div>

              <form className="flex flex-col gap-4" onSubmit={(e) => void onAdd(e)}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Service name"
                    description="A label you choose (Discord, Exchange, Work SSO…)"
                    placeholder="e.g. Discord"
                    variant="bordered"
                    value={form.service}
                    onValueChange={(v) => setForm({ ...form, service: v })}
                    startContent={
                      <Icon className="text-default-400" icon="solar:global-linear" width={18} />
                    }
                  />
                  <Input
                    label="Account label"
                    description="Usually your email or username for that service"
                    placeholder="e.g. alex@mail.com"
                    variant="bordered"
                    value={form.account}
                    onValueChange={(v) => setForm({ ...form, account: v })}
                    startContent={
                      <Icon className="text-default-400" icon="solar:user-linear" width={18} />
                    }
                  />
                </div>
                <Input
                  label="Setup key (secret)"
                  description="From the app’s 2FA screen: “manual entry” or “secret key”"
                  placeholder="Paste the long key here"
                  variant="bordered"
                  classNames={{ input: "font-mono" }}
                  value={form.secret}
                  onValueChange={(v) => setForm({ ...form, secret: v })}
                  autoComplete="off"
                  startContent={
                    <Icon className="text-default-400" icon="solar:lock-password-linear" width={18} />
                  }
                />
                <Input
                  label="Or setup link (optional)"
                  description="Only if you already have a link starting with otpauth://totp/"
                  placeholder="otpauth://totp/…"
                  variant="bordered"
                  classNames={{ input: "font-mono text-tiny" }}
                  value={form.otpauth}
                  onValueChange={(v) => setForm({ ...form, otpauth: v })}
                  startContent={
                    <Icon className="text-default-400" icon="solar:qr-code-linear" width={18} />
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="bordered"
                    radius="full"
                    size="sm"
                    startContent={<Icon icon="solar:play-circle-linear" width={16} />}
                    onPress={() =>
                      setForm({
                        service: "Demo",
                        account: "practice",
                        secret: "JBSWY3DPEHPK3PXP",
                        otpauth: "",
                      })
                    }
                  >
                    Fill demo secret
                  </Button>
                  <Button
                    type="submit"
                    color="primary"
                    radius="full"
                    isLoading={busy}
                    startContent={
                      !busy ? (
                        <Icon icon="solar:cloud-upload-bold" width={18} />
                      ) : undefined
                    }
                  >
                    {busy ? "Confirm in wallet…" : "Encrypt & store on Monad"}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-large font-medium">Your codes</p>
                <p className="text-small text-default-500">
                  {loading ? "Loading…" : `${rows.length} secret${rows.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
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
                  variant="light"
                  startContent={<Icon icon="solar:lock-linear" width={16} />}
                  onPress={lock}
                >
                  Lock
                </Button>
              </div>
            </div>

            {!loading && rows.length === 0 && (
              <Card className="border-small border-dashed border-default-200" shadow="none">
                <CardBody className="items-center gap-2 py-10 text-center">
                  <Icon
                    className="text-default-300"
                    icon="solar:inbox-line-bold-duotone"
                    width={40}
                  />
                  <p className="text-small text-default-500">No secrets yet. Add one above.</p>
                </CardBody>
              </Card>
            )}

            <div className="flex flex-col gap-3">
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
          </div>
        </>
      )}

      {err && (
        <Card className="border-small border-danger-300" shadow="sm">
          <CardBody className="flex flex-row items-start gap-3 p-4">
            <Icon className="text-danger" icon="solar:danger-circle-bold" width={22} />
            <p className="text-small text-danger">{err}</p>
          </CardBody>
        </Card>
      )}

      <div className="pb-10" />
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
