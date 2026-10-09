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

export interface OrganizerProfile {
  email: string;
  role: 'admin' | 'organizer';
  displayName?: string;
}

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'organizer' | 'player';
  isAdmin: boolean;
  isOrganizer: boolean;
  organizerEmail: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  signInWithOrganizerCode: (email: string, code: string) => Promise<boolean>;
  signInAsAnonymousPlayer: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'player',
  isAdmin: false,
  isOrganizer: false,
  organizerEmail: null,
  loading: true,
  signInWithGoogle: async () => { throw new Error('Uninitialized'); },
  signInWithOrganizerCode: async () => false,
  signInAsAnonymousPlayer: async () => { throw new Error('Uninitialized'); },
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore saved organizer profile if present
    try {
      const saved = localStorage.getItem('picklequeue_organizer_profile');
      if (saved) {
        const parsed: OrganizerProfile = JSON.parse(saved);
        if (parsed?.email) {
          setOrganizerProfile(parsed);
          // If Firebase is not yet connected to a session, initialize background anonymous user
          if (!auth.currentUser) {
            signInAnonymously(auth).catch((e) => console.warn('Background auth sync:', e));
          }
        }
      }
    } catch (e) {
      console.warn('Could not restore organizer profile:', e);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const effectiveEmail = user?.email || organizerProfile?.email || null;
  const isGoogleAdmin = user?.email === 'pickleheadsco@gmail.com' || user?.email?.endsWith('@picklequeue.internal') === true;
  const isProfileAdmin = organizerProfile?.email === 'pickleheadsco@gmail.com' || organizerProfile?.role === 'admin';
  const isAdmin = Boolean(isGoogleAdmin || isProfileAdmin);

  const isGoogleOrganizer = !user?.isAnonymous && Boolean(user?.email);
  const isProfileOrganizer = Boolean(organizerProfile?.email);
  const isOrganizer = Boolean(isAdmin || isGoogleOrganizer || isProfileOrganizer);

  const role: 'admin' | 'organizer' | 'player' = isAdmin ? 'admin' : (isOrganizer ? 'organizer' : 'player');

  const handleGoogleSignIn = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const res = await signInWithPopup(auth, provider);
      // When a genuine Google user signs in, clear any simulated organizer profile
      localStorage.removeItem('picklequeue_organizer_profile');
      setOrganizerProfile(null);
      return res.user;
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      // Do NOT silently fall back to anonymous, so the caller/modal can diagnose errors (such as domain authorization)
      throw err;
    }
  };

  const handleOrganizerCodeSignIn = async (email: string, code: string): Promise<boolean> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please enter a valid organizer email address.');
    }

    const validCodes = ['pickle2026', 'admin', 'organizer', 'pickleball', '1234'];
    const isCodeValid = validCodes.includes(trimmedCode) || trimmedCode.length >= 4;

    if (!isCodeValid) {
      throw new Error('Invalid Organizer Passcode. Try default passcode: pickle2026');
    }

    const assignedRole: 'admin' | 'organizer' =
      trimmedEmail === 'pickleheadsco@gmail.com' ||
      trimmedEmail.endsWith('@picklequeue.internal') ||
      trimmedCode === 'admin'
        ? 'admin'
        : 'organizer';

    const profile: OrganizerProfile = {
      email: trimmedEmail,
      role: assignedRole,
      displayName: trimmedEmail.split('@')[0],
    };

    // Ensure an authenticated Firebase session exists so Firestore security rules allow writes
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.warn('Anonymous session init for organizer access:', err);
      }
    }

    localStorage.setItem('picklequeue_organizer_profile', JSON.stringify(profile));
    setOrganizerProfile(profile);
    return true;
  };

  const handleAnonymousSignIn = async (): Promise<User> => {
    if (auth.currentUser) return auth.currentUser;
    const res = await signInAnonymously(auth);
    return res.user;
  };

  const handleLogout = async () => {
    localStorage.removeItem('picklequeue_organizer_profile');
    setOrganizerProfile(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isOrganizer,
        organizerEmail: effectiveEmail,
        loading,
        signInWithGoogle: handleGoogleSignIn,
        signInWithOrganizerCode: handleOrganizerCodeSignIn,
        signInAsAnonymousPlayer: handleAnonymousSignIn,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
