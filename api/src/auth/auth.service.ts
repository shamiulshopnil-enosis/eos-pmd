import { createHash, randomInt } from "crypto";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { MODEL } from "../schemas/schemas";

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashCode(email: string, code: string): string {
  return createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}:${process.env.AUTH_SECRET ?? ""}`)
    .digest("hex");
}

// Ported from the Next.js app's src/lib/auth.ts (one-time login codes). No email
// is sent in this prototype — the plaintext code is returned so the Next app can
// show it on screen / log it.
@Injectable()
export class AuthService {
  constructor(@InjectModel(MODEL.LoginCode) private readonly loginCodes: Model<any>) {}

  async createLoginCode(email: string, purpose: "login" | "invite" = "login"): Promise<string> {
    const normalized = normalizeEmail(email);
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await this.loginCodes.create({
      email: normalized,
      codeHash: hashCode(normalized, code),
      purpose,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    return code;
  }

  async verifyLoginCode(
    email: string,
    code: string,
    purpose: "login" | "invite" = "login",
  ): Promise<boolean> {
    const normalized = normalizeEmail(email);
    const record = await this.loginCodes
      .findOne({
        email: normalized,
        purpose,
        consumedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 });

    if (!record) return false;
    if (record.codeHash !== hashCode(normalized, code.trim())) return false;

    record.consumedAt = new Date();
    await record.save();
    return true;
  }
}
