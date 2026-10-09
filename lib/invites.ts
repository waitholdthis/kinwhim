import { database, nowSeconds } from "@/lib/kinwhim-server";

export const MAX_CIRCLE_MEMBERS = 10;

const WORDS = ["WINK", "MOON", "MINT", "BLOOM", "PICO", "JOLLY", "NOVA", "BIRD", "FIG", "PLUM", "KITE", "SUNNY"];
// No 0/O or 1/I so codes survive being read aloud.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

// Invite codes are the only way into a circle, so they carry ~30 bits of
// randomness and joins are rate limited.
export function makeInviteCode() {
  const random = crypto.getRandomValues(new Uint8Array(7));
  const word = WORDS[random[0] % WORDS.length];
  const suffix = Array.from(random.slice(1), (byte) => ALPHABET[byte % ALPHABET.length]).join("");
  return `${word}-${suffix}`;
}

export function normalizeInviteCode(value: unknown) {
  const code = typeof value === "string" ? value.trim().toUpperCase().replace(/\s+/g, "") : "";
  return /^[A-Z0-9-]{4,24}$/.test(code) ? code : null;
}

export async function rotateInviteCode(circleId: string) {
  const code = makeInviteCode();
  await database()
    .prepare("UPDATE circles SET invite_code = ?, invite_rotated_at = ? WHERE id = ?")
    .bind(code, nowSeconds(), circleId)
    .run();
  return code;
}
