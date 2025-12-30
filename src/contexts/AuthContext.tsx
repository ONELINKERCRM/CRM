import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  company_id: string | null;
  dashboard_preferences: any;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, onboarding_completed, company_id, dashboard_preferences")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setProfile(data);
      } else if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
        // JWT expired, try to refresh
        await refreshSession();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Refresh session and return success status
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Session refresh failed:', error);
        // Session truly expired, sign out
        setUser(null);
        setSession(null);
        setProfile(null);
        toast.error('Session expired. Please log in again.');
        return false;
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        if (data.session.user) {
          await fetchProfile(data.session.user.id);
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }, []);

  // Check if session is about to expire (within 5 minutes)
  const isSessionExpiringSoon = useCallback((sess: Session | null): boolean => {
    if (!sess?.expires_at) return false;
    const expiresAt = sess.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return expiresAt - now < fiveMinutes;
  }, []);

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    let mounted = true;

    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (initialSession) {
          // Check if session is expired or expiring soon
          if (isSessionExpiringSoon(initialSession)) {
            const refreshed = await refreshSession();
            if (!refreshed && mounted) {
              setIsLoading(false);
            }
          } else {
            setSession(initialSession);
            setUser(initialSession.user);
            if (initialSession.user) {
              await fetchProfile(initialSession.user.id);
            }
          }
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('Auth event:', event);

        if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession);
          setUser(newSession.user);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
        } else if (event === 'SIGNED_IN' && newSession) {
          setSession(newSession);
          setUser(newSession.user);
          if (newSession.user) {
            setTimeout(() => {
              if (mounted) fetchProfile(newSession.user.id);
            }, 0);
          }
        } else {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user) {
            setTimeout(() => {
              if (mounted) fetchProfile(newSession.user.id);
            }, 0);
          } else {
            setProfile(null);
          }
        }

        if (mounted) {
          setIsLoading(false);
        }
      }
    );

    // Auto-refresh session every 4 minutes to prevent JWT expiration
    refreshInterval = setInterval(async () => {
      if (!mounted) return;

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession && isSessionExpiringSoon(currentSession)) {
        await refreshSession();
      }
    }, 4 * 60 * 1000);

    // Refresh session when tab becomes visible (user returns to tab)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mounted) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          // Always try to refresh when returning to tab if session exists
          if (isSessionExpiringSoon(currentSession)) {
            await refreshSession();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Refresh session on window focus
    const handleFocus = async () => {
      if (mounted) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession && isSessionExpiringSoon(currentSession)) {
          await refreshSession();
        }
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSession, isSessionExpiringSoon]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    return { error };
  };

  const signOut = async () => {
    // Clear local state first to ensure UI updates immediately
    setUser(null);
    setSession(null);
    setProfile(null);

    // Then attempt server-side signout (ignore errors if session already expired)
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      // Session may already be expired, that's okay
      console.log('Sign out completed (session may have been expired)');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, signIn, signInWithGoogle, signUp, signOut, refreshProfile, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
