import { revokeAppleToken } from "@/lib/auth/apple";
import { REPORT_EVIDENCE_RETENTION_DAYS, SELFIE_RETENTION_DAYS } from "@/lib/policies";
import { bucket, database } from "@/lib/kinwhim-server";

async function deleteObjects(keys: Array<string | null | undefined>) {
  const present = keys.filter((key): key is string => Boolean(key));
  // R2 accepts up to 1000 keys per delete call.
  for (let index = 0; index < present.length; index += 1000) {
    await bucket().delete(present.slice(index, index + 1000));
  }
}

export async function deleteMemories(memoryIds: string[]) {
  if (!memoryIds.length) return;
  const db = database();
  for (const memoryId of memoryIds) {
    const memory = await db
      .prepare("SELECT media_key AS mediaKey FROM memories WHERE id = ?")
      .bind(memoryId)
      .first<{ mediaKey: string }>();
    await deleteObjects([memory?.mediaKey]);
    await db.batch([
      db.prepare("DELETE FROM reactions WHERE memory_id = ?").bind(memoryId),
      db.prepare("DELETE FROM notification_reads WHERE memory_id = ?").bind(memoryId),
      db.prepare("DELETE FROM memory_participants WHERE memory_id = ?").bind(memoryId),
      db.prepare("DELETE FROM memories WHERE id = ?").bind(memoryId),
    ]);
  }
}

export async function deleteCheckins(where: { userId: string; circleId?: string }) {
  const db = database();
  const filter = where.circleId ? "user_id = ? AND circle_id = ?" : "user_id = ?";
  const binds = where.circleId ? [where.userId, where.circleId] : [where.userId];
  const rows = await db
    .prepare(`SELECT photo_key AS photoKey FROM checkins WHERE ${filter}`)
    .bind(...binds)
    .all<{ photoKey: string }>();
  await deleteObjects(rows.results.map((row) => row.photoKey));
  await db.prepare(`DELETE FROM checkins WHERE ${filter}`).bind(...binds).run();
}

export async function deleteCircle(circleId: string) {
  const db = database();
  const memories = await db
    .prepare("SELECT id FROM memories WHERE circle_id = ?")
    .bind(circleId)
    .all<{ id: string }>();
  await deleteMemories(memories.results.map((row) => row.id));
  const checkins = await db
    .prepare("SELECT photo_key AS photoKey FROM checkins WHERE circle_id = ?")
    .bind(circleId)
    .all<{ photoKey: string }>();
  await deleteObjects(checkins.results.map((row) => row.photoKey));
  await db.batch([
    db.prepare("DELETE FROM checkins WHERE circle_id = ?").bind(circleId),
    db.prepare("DELETE FROM generation_jobs WHERE circle_id = ?").bind(circleId),
    db.prepare("DELETE FROM checkin_log WHERE circle_id = ?").bind(circleId),
    db.prepare("DELETE FROM notification_log WHERE circle_id = ?").bind(circleId),
    db.prepare("DELETE FROM circle_members WHERE circle_id = ?").bind(circleId),
    db.prepare("DELETE FROM circles WHERE id = ?").bind(circleId),
  ]);
}

// Removes someone from a circle (they left, or the keeper removed them).
// Their selfies in that circle are deleted; if they kept the circle, the
// longest-standing remaining member becomes keeper; an empty circle is deleted.
export async function removeMember(circleId: string, userId: string) {
  const db = database();
  await deleteCheckins({ userId, circleId });
  await db.batch([
    db.prepare("DELETE FROM circle_members WHERE circle_id = ? AND user_id = ?").bind(circleId, userId),
    db.prepare("DELETE FROM checkin_log WHERE circle_id = ? AND user_id = ?").bind(circleId, userId),
  ]);
  const next = await db
    .prepare("SELECT user_id AS userId FROM circle_members WHERE circle_id = ? ORDER BY joined_at ASC LIMIT 1")
    .bind(circleId)
    .first<{ userId: string }>();
  if (!next) {
    await deleteCircle(circleId);
    return;
  }
  const circle = await db
    .prepare("SELECT owner_id AS ownerId FROM circles WHERE id = ?")
    .bind(circleId)
    .first<{ ownerId: string }>();
  if (circle?.ownerId === userId) {
    await db.batch([
      db.prepare("UPDATE circles SET owner_id = ? WHERE id = ?").bind(next.userId, circleId),
      db
        .prepare("UPDATE circle_members SET role = 'owner' WHERE circle_id = ? AND user_id = ?")
        .bind(circleId, next.userId),
    ]);
  }
}

export async function deleteAccount(userId: string) {
  const db = database();

  const identities = await db
    .prepare("SELECT provider, refresh_token AS refreshToken FROM identities WHERE user_id = ?")
    .bind(userId)
    .all<{ provider: string; refreshToken: string | null }>();
  for (const identity of identities.results) {
    if (identity.provider === "apple" && identity.refreshToken) {
      await revokeAppleToken(identity.refreshToken).catch((error) => console.error(error));
    }
  }

  // Memories feature this person's likeness, so they go with the account.
  const featured = await db
    .prepare("SELECT memory_id AS memoryId FROM memory_participants WHERE user_id = ?")
    .bind(userId)
    .all<{ memoryId: string }>();
  await deleteMemories(featured.results.map((row) => row.memoryId));
  await deleteCheckins({ userId });

  const memberships = await db
    .prepare("SELECT circle_id AS circleId FROM circle_members WHERE user_id = ?")
    .bind(userId)
    .all<{ circleId: string }>();
  for (const { circleId } of memberships.results) await removeMember(circleId, userId);

  const profile = await db
    .prepare("SELECT email, avatar_key AS avatarKey FROM profiles WHERE id = ?")
    .bind(userId)
    .first<{ email: string; avatarKey: string | null }>();
  await deleteObjects([profile?.avatarKey]);

  await db.batch([
    db.prepare("DELETE FROM reactions WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM notification_reads WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM push_tokens WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM checkin_log WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM notification_log WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM identities WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM user_blocks WHERE blocker_id = ? OR blocked_id = ?").bind(userId, userId),
    db.prepare("DELETE FROM email_codes WHERE email = ?").bind(profile?.email?.toLowerCase() ?? ""),
    db.prepare("DELETE FROM profiles WHERE id = ?").bind(userId),
  ]);
}

// Deletes raw selfies once they are older than the retention window. The
// memories made from them are unaffected.
export async function purgeExpiredSelfies() {
  const cutoff = new Date(Date.now() - SELFIE_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  const db = database();
  const rows = await db
    .prepare("SELECT id, photo_key AS photoKey FROM checkins WHERE day < ? LIMIT 500")
    .bind(cutoff)
    .all<{ id: string; photoKey: string }>();
  await deleteObjects(rows.results.map((row) => row.photoKey));
  for (const row of rows.results) {
    await db.prepare("DELETE FROM checkins WHERE id = ?").bind(row.id).run();
  }
  return rows.results.length;
}

// Evidence copies for actioned reports are kept for appeals, then removed.
export async function purgeOldEvidence() {
  const cutoff = Math.floor(Date.now() / 1000) - REPORT_EVIDENCE_RETENTION_DAYS * 86_400;
  const db = database();
  const rows = await db
    .prepare("SELECT id, evidence_key AS evidenceKey FROM reports WHERE evidence_key IS NOT NULL AND resolved_at < ? LIMIT 200")
    .bind(cutoff)
    .all<{ id: string; evidenceKey: string }>();
  await deleteObjects(rows.results.map((row) => row.evidenceKey));
  for (const row of rows.results) {
    await db.prepare("UPDATE reports SET evidence_key = NULL WHERE id = ?").bind(row.id).run();
  }
  return rows.results.length;
}
