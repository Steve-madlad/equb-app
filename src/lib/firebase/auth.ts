import { getAdminAuth } from "@/lib/firebase/admin";
import { COLLECTIONS, getAdminDb } from "@/lib/firebase/admin";
import type { UserProfile, UserRole } from "@/lib/domain/types";

const DEFAULT_RATING = 100;

function normalizeRating(rating: unknown): number {
  const value = typeof rating === "number" ? rating : DEFAULT_RATING;
  return Math.max(0, Math.min(100, value));
}

export async function verifyAuthToken(
  authHeader: string | null
): Promise<{ uid: string; email?: string }> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);
  const decoded = await getAdminAuth().verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.users).doc(userId).get();
  if (!doc.exists) return null;

  const data = doc.data() as Partial<UserProfile>;
  const now = new Date().toISOString();
  return {
    id: data.id ?? userId,
    email: data.email ?? "",
    displayName: data.displayName ?? "User",
    role: data.role ?? "USER",
    rating: normalizeRating(data.rating),
    ratingUpdatedAt: data.ratingUpdatedAt ?? now,
    phone: data.phone,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
}

export async function requireRole(
  userId: string,
  role: UserRole
): Promise<UserProfile> {
  const profile = await getUserProfile(userId);
  if (!profile) throw new Error("User profile not found");
  if (profile.role !== role) throw new Error("Insufficient permissions");
  return profile;
}

export async function createUserProfile(params: {
  id: string;
  email: string;
  displayName: string;
  role?: UserRole;
}): Promise<UserProfile> {
  const db = getAdminDb();
  const now = new Date().toISOString();
  const profile: UserProfile = {
    id: params.id,
    email: params.email,
    displayName: params.displayName,
    role: params.role ?? "USER",
    rating: DEFAULT_RATING,
    ratingUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection(COLLECTIONS.users).doc(profile.id).set(profile);
  return profile;
}

export async function adjustUserRating(
  userId: string,
  delta: number,
  reason?: string
): Promise<UserProfile> {
  const db = getAdminDb();
  const current = await getUserProfile(userId);
  if (!current) throw new Error("User profile not found");

  const nextRating = Math.max(0, Math.min(100, current.rating + delta));
  const ratingUpdatedAt = new Date().toISOString();

  await db.collection(COLLECTIONS.users).doc(userId).update({
    rating: nextRating,
    ratingUpdatedAt,
    updatedAt: ratingUpdatedAt,
    ...(reason ? { ratingReason: reason } : {}),
  });

  return {
    ...current,
    rating: nextRating,
    ratingUpdatedAt,
    updatedAt: ratingUpdatedAt,
  };
}

export async function requireAuth(
  authHeader: string | null
): Promise<UserProfile> {
  const { uid } = await verifyAuthToken(authHeader);
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("User profile not found");
  return profile;
}

export async function requireAdmin(
  authHeader: string | null
): Promise<UserProfile> {
  const { uid } = await verifyAuthToken(authHeader);
  return requireRole(uid, "ADMIN");
}
