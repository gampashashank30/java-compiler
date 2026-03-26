import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "firebase/auth";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  provider: string;
  createdAt: any;
  lastLoginAt: any;
}

export async function saveUserToFirestore(user: User, provider: string): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);

  const data: Partial<UserProfile> = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    photoURL: user.photoURL,
    provider,
    lastLoginAt: serverTimestamp(),
  };

  if (!existing.exists()) {
    data.createdAt = serverTimestamp();
  }

  await setDoc(userRef, data, { merge: true });
}

export async function getUserFromFirestore(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}
