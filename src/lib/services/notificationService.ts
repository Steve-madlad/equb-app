import type { Notification, NotificationType } from '@/lib/domain/types';
import { COLLECTIONS, getAdminDb } from '@/lib/firebase/admin';
import { v4 as uuidv4 } from 'uuid';

export async function createNotification(params: {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  equbId?: string;
}): Promise<Notification> {
  const db = getAdminDb();
  const { id, ...rest } = params;
  const notification: Notification = {
    ...rest,
    id: id ?? uuidv4(),
    read: false,
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.notifications).doc(notification.id).set(notification);
  return notification;
}

export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.notifications)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  return snapshot.docs.map((doc) => doc.data() as Notification);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.notifications)
    .where('userId', '==', userId)
    .where('read', '==', false)
    .get();

  return snapshot.size;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const db = getAdminDb();
  await db.collection(COLLECTIONS.notifications).doc(notificationId).update({ read: true });
}

/** Claims an unread notification so only one page/tab can present it. */
export async function claimNotification(notificationId: string, userId: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.notifications).doc(notificationId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists || snapshot.data()?.userId !== userId || snapshot.data()?.read) {
      return false;
    }
    transaction.update(ref, { read: true });
    return true;
  });
}

export async function clearPayoutProcessingNotifications(
  userId: string,
  equbId: string,
): Promise<void> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.notifications)
    .where('userId', '==', userId)
    .where('equbId', '==', equbId)
    .where('type', '==', 'PAYOUT_PROCESSING')
    .where('read', '==', false)
    .get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
  await batch.commit();
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.notifications)
    .where('userId', '==', userId)
    .where('read', '==', false)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
  await batch.commit();
}
