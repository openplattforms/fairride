import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  loyalty_points: number;
  first_ride_used: boolean;
}

interface UserRole {
  role: 'customer' | 'driver' | 'admin';
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  role: UserRole['role'] | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone: string, role: 'customer' | 'driver') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole['role'] | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrateFromSession = async (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Ensure role is known before we mark loading=false (prevents drivers seeing customer UI briefly)
        await Promise.all([fetchProfile(session.user.id), fetchRole(session.user.id)]);
      } else {
        setProfile(null);
        setRole(null);
      }

      setLoading(false);
    };

    setLoading(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      await hydrateFromSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => hydrateFromSession(session));

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data && !error) {
      setProfile(data as UserProfile);
    }
  };

  const fetchRole = async (userId: string) => {
    // Prefer driver over customer if multiple roles exist (common if default role was inserted on signup)
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error || !data) return;

    const roles = (data as Array<{ role: UserRole['role'] }>).map((r) => r.role);
    const resolved: UserRole['role'] = roles.includes('driver')
      ? 'driver'
      : roles.includes('admin')
        ? 'admin'
        : 'customer';

    setRole(resolved);
  };

  const signUp = async (email: string, password: string, name: string, phone: string, role: 'customer' | 'driver') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });

    if (error) throw error;

    if (data.user) {
      // Update profile with phone
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: name, phone })
        .eq('user_id', data.user.id);

      if (profileError) console.error('Profile update error:', profileError);

      if (role === 'driver') {
        // Ensure the user ends up with ONLY the driver role (prevents routing to customer UI)
        await supabase.from('user_roles').delete().eq('user_id', data.user.id);

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: data.user.id, role: 'driver' });

        if (roleError) console.error('Role insert error:', roleError);

        const { error: driverError } = await supabase
          .from('drivers')
          .insert({
            user_id: data.user.id,
            vehicle_model: 'Standard',
            vehicle_plate: '',
            is_online: false,
          });

        if (driverError) console.error('Driver insert error:', driverError);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setRole(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, session, loading, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
