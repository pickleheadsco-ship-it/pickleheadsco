import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInAnonymously,
} from 'firebase/auth';
import { auth } from '../services/firebase/config';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'organizer' | 'player';
  isAdmin: boolean;
  isOrganizer: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsAnonymousPlayer: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'player',
  isAdmin: false,
  isOrganizer: false,
  loading: true,
  signInWithGoogle: async () => {},
  signInAsAnonymousPlayer: async () => { throw new Error('Uninitialized'); },
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === 'pickleheadsco@gmail.com' || user?.email?.endsWith('@picklequeue.internal') === true;
  const isOrganizer = isAdmin || (!user?.isAnonymous && Boolean(user?.email));
  const role: 'admin' | 'organizer' | 'player' = isAdmin ? 'admin' : (isOrganizer ? 'organizer' : 'player');

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      // Fallback for environments with strict popup policies: anonymous sign in so the user is never blocked
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        await signInAnonymously(auth);
      } else {
        throw err;
      }
    }
  };

  const handleAnonymousSignIn = async (): Promise<User> => {
    if (auth.currentUser) return auth.currentUser;
    const res = await signInAnonymously(auth);
    return res.user;
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isOrganizer,
        loading,
        signInWithGoogle: handleGoogleSignIn,
        signInAsAnonymousPlayer: handleAnonymousSignIn,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
