import * as OTPAuth from "otpauth";

export function generateTotp(secretBase32: string): {
  token: string;
  remaining: number;
  period: number;
} {
  const period = 30;
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secretBase32.replace(/\s+/g, "")),
    algorithm: "SHA1",
    digits: 6,
    period,
  });
  const token = totp.generate();
  const now = Math.floor(Date.now() / 1000);
  const remaining = period - (now % period);
  return { token, remaining, period };
}

export function cleanSecret(s: string): string {
  return s.replace(/\s+/g, "").toUpperCase();
}
