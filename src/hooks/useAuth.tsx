
import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { loadProfile, loadUserRole, patchProfileCache, clearUserCache } from '@/lib/appDataCache';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, phone: string, linkfacebook?: string, agentName?: string, address?: string, businessNumber?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  patchProfile: (patch: Record<string, any>) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUserIdRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string, force = false) => {
    try {
      const [profileData, role] = await Promise.all([
        loadProfile(userId, force),
        loadUserRole(userId, force).catch(() => null),
      ]);
      // Ignore results if the session switched to a different user meanwhile
      if (currentUserIdRef.current !== userId) return;
      setProfile({
        ...profileData,
        role: role || 'user'
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const applySession = (session: Session | null) => {
    setSession(session);
    setUser(session?.user ?? null);
    const newId = session?.user?.id ?? null;
    if (newId !== currentUserIdRef.current) {
      currentUserIdRef.current = newId;
      setProfile(null);
      if (newId) fetchProfile(newId); // cache + in-flight dedupe => at most 1 request each
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setTimeout(() => applySession(session), 0);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (currentUserIdRef.current) await fetchProfile(currentUserIdRef.current, true);
  };

  const patchProfile = (patch: Record<string, any>) => {
    const id = currentUserIdRef.current;
    if (!id) return;
    patchProfileCache(id, patch);
    setProfile((prev: any) => (prev ? { ...prev, ...patch } : prev));
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string, linkfacebook?: string, agentName?: string, address?: string, businessNumber?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          linkfacebook: linkfacebook || '',
          agent_name: agentName || '',
          address: address || '',
          business_number: businessNumber || '',
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (currentUserIdRef.current) clearUserCache(currentUserIdRef.current);
    currentUserIdRef.current = null;
    // Clear all local storage related to auth
    localStorage.removeItem('sb-imxesrkdgciojihloufi-auth-token');
    localStorage.clear();
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all state
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // Force page reload to clear any cached data
    window.location.reload();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    patchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
