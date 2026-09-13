import { db } from './firebase';
import * as firestoreModule from 'firebase/firestore';
const { collection, addDoc, updateDoc, doc, query, where, orderBy, onSnapshot, writeBatch, getDocs } = firestoreModule as any;

export type NotifType =
  | 'mission_new'
  | 'mission_accepted'
  | 'mission_completed'
  | 'mission_disputed'
  | 'mission_cancelled'
  | 'payment_received'
  | 'withdrawal_approved'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotifType;
  read: boolean;
  createdAt: string;
  missionId?: string;
}

// Send a notification to a user
export const sendNotification = async (
  userId: string,
  title: string,
  body: string,
  type: NotifType,
  missionId?: string
): Promise<void> => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      body,
      type,
      read: false,
      createdAt: new Date().toISOString(),
      ...(missionId ? { missionId } : {}),
    });
  } catch (e) {
    console.warn("Could not send notification:", e);
  }
};

// Listen to unread notifications for a user (real-time)
export const subscribeNotifications = (
  userId: string,
  callback: (notifs: AppNotification[]) => void
): (() => void) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap: any) => {
      const notifs: AppNotification[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      callback(notifs);
    });
  } catch {
    return () => {};
  }
};

// Mark a single notification as read
export const markAsRead = async (notifId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  } catch {}
};

// Mark all notifications as read for a user
export const markAllAsRead = async (userId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d: any) => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch {}
};
