import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  subscription: { plan: string; status: string } | null;
  organization: { id: string; name: string; policies?: any[] } | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, subscription: null, organization: null, loading: true, isAuthReady: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<{ plan: string; status: string } | null>(null);
  const [organization, setOrganization] = useState<{ id: string; name: string; policies?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userRef);
          let userData = userDoc.data();
          
          if (!userDoc.exists()) {
            const defaultSub = { plan: 'free', status: 'active' };
            userData = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              createdAt: serverTimestamp(),
              subscription: defaultSub,
              orgId: null,
              role: 'member'
            };
            await setDoc(userRef, userData);
            setSubscription(defaultSub);
          } else {
            setSubscription(userData?.subscription || { plan: 'free', status: 'active' });
          }

          if (userData?.orgId) {
            const orgRef = doc(db, 'organizations', userData.orgId);
            const orgDoc = await getDoc(orgRef);
            if (orgDoc.exists()) {
              setOrganization({ id: orgDoc.id, ...orgDoc.data() } as any);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
        setUser(user);
      } else {
        setUser(null);
        setSubscription(null);
        setOrganization(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, subscription, organization, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
