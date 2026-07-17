/**
 * GhostKeys unlock + AES-GCM for OTP secrets.
 *
 * Hardening (v1 scheme):
 * - Unlock message is domain + chain + wallet + vault bound (not a global fixed string)
 * - AES key = SHA-256(signature || origin || chainId || address || vault || scheme)
 * - So a signature phished on another site (different origin) cannot decrypt Monad blobs
 * - Signature stays in memory only (caller must not persist it)
 *
 * A phish of THIS exact message on THIS exact origin can still yield the key.
 */

import { getActiveChain, getVaultAddress } from "./chain";

export const UNLOCK_SCHEME = "ghostkeys-unlock-v1";

export type SecretPayload = {
  v: 1;
  service: string;
  account: string;
  /** Base32 TOTP secret (as shown by services / otpauth URI) */
  secret: string;
  issuer?: string;
};

export type UnlockContext = {
  address: `0x${string}`;
  chainId: number;
  /** e.g. http://127.0.0.1:4321 — phishing site gets a different key */
  origin: string;
  vault: `0x${string}`;
};

/** Build deterministic unlock message for personal_sign (no timestamp = stable key). */
export function buildUnlockMessage(ctx: UnlockContext): string {
  const origin = normalizeOrigin(ctx.origin);
  const address = ctx.address.toLowerCase();
  const vault = ctx.vault.toLowerCase();

  return [
    "GhostKeys unlock",
    "",
    "Sign this only on the real GhostKeys site to unlock your authenticator codes.",
    "This does not send a transaction or spend tokens.",
    "",
    `URI: ${origin}`,
    `Version: 1`,
    `Chain ID: ${ctx.chainId}`,
    `Address: ${address}`,
    `Vault: ${vault}`,
    `Scheme: ${UNLOCK_SCHEME}`,
  ].join("\n");
}

/** Resolve unlock context from the current browser + wallet. */
export function resolveUnlockContext(address: `0x${string}`): UnlockContext {
  if (typeof window === "undefined") {
    throw new Error("Unlock only works in the browser");
  }
  const chain = getActiveChain();
  return {
    address,
    chainId: chain.id,
    origin: window.location.origin,
    vault: getVaultAddress(),
  };
}

export function unlockMessageForAddress(address: `0x${string}`): string {
  return buildUnlockMessage(resolveUnlockContext(address));
}

/** @deprecated use unlockMessageForAddress */
export function unlockMessage(): string {
  throw new Error("Use unlockMessageForAddress(address) with a connected wallet");
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  const copy = new Uint8Array(raw);
  return crypto.subtle.importKey("raw", copy, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Derive AES-256 key material from unlock signature + binding fields.
 * Binding prevents reusing a signature captured under another origin/chain.
 */
export async function keyFromUnlock(
  signatureHex: string,
  ctx: UnlockContext
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const material = [
    signatureHex.toLowerCase(),
    normalizeOrigin(ctx.origin),
    String(ctx.chainId),
    ctx.address.toLowerCase(),
    ctx.vault.toLowerCase(),
    UNLOCK_SCHEME,
  ].join("|");
  const dig = await crypto.subtle.digest("SHA-256", enc.encode(material));
  return importAesKey(new Uint8Array(dig));
}

export async function encryptPayload(
  payload: SecretPayload,
  signatureHex: string,
  ctx: UnlockContext
): Promise<Uint8Array> {
  assertUnlockContext(ctx);
  const key = await keyFromUnlock(signatureHex, ctx);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const out = new Uint8Array(iv.length + new Uint8Array(ct).length);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), iv.length);
  return out;
}

export async function decryptPayload(
  ciphertext: Uint8Array,
  signatureHex: string,
  ctx: UnlockContext
): Promise<SecretPayload> {
  assertUnlockContext(ctx);
  const key = await keyFromUnlock(signatureHex, ctx);
  if (ciphertext.length < 13) throw new Error("Ciphertext too short");
  const iv = ciphertext.slice(0, 12);
  const data = ciphertext.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  const obj = JSON.parse(new TextDecoder().decode(plain)) as SecretPayload;
  if (obj.v !== 1 || !obj.secret || !obj.service) {
    throw new Error("Invalid secret payload");
  }
  return obj;
}

function assertUnlockContext(ctx: UnlockContext) {
  if (!ctx.address || !ctx.origin || !ctx.vault) {
    throw new Error("Incomplete unlock context");
  }
  if (ctx.vault === "0x0000000000000000000000000000000000000000") {
    throw new Error("GhostKeys contract address not configured");
  }
}

function normalizeOrigin(origin: string): string {
  try {
    const u = new URL(origin);
    return `${u.protocol}//${u.host}`;
  } catch {
    return origin.replace(/\/$/, "");
  }
}

/** Parse otpauth://totp/... URIs from QR codes */
export function parseOtpauthUri(uri: string): Partial<SecretPayload> | null {
  try {
    if (!uri.startsWith("otpauth://")) return null;
    const u = new URL(uri);
    if (u.protocol !== "otpauth:") return null;
    const secret = u.searchParams.get("secret");
    if (!secret) return null;
    const issuer = u.searchParams.get("issuer") ?? undefined;
    const label = decodeURIComponent(
      u.pathname.replace(/^\/\/totp\//, "").replace(/^\//, "")
    );
    let service = issuer ?? "App";
    let account = label;
    if (label.includes(":")) {
      const [a, ...rest] = label.split(":");
      service = issuer ?? a ?? service;
      account = rest.join(":") || label;
    }
    return { v: 1, service, account, secret, issuer };
  } catch {
    return null;
  }
}

export function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;
}

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
