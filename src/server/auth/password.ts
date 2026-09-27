import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const COST = 12;
export const MIN_PASSWORD_LENGTH = 12;

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < MIN_PASSWORD_LENGTH) {
    throw new RangeError(`Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

let dummyHash: Promise<string> | undefined;

/**
 * Compared against when the email is unknown so response timing does not
 * reveal which accounts exist.
 */
export function timingSafeDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash(randomBytes(16).toString("hex"), COST);
  return dummyHash;
}
