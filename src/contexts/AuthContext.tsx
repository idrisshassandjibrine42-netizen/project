import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const LOCAL_USERS_KEY = "demo-admin-users";

const readLocalUsers = () => {
  if (typeof window === "undefined")
    return [] as Array<{
      id: string;
      email: string;
      full_name?: string;
      created_at?: string;
    }>;

  try {
    const stored = window.localStorage.getItem(LOCAL_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalUser = (user: {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
}) => {
  const current = readLocalUsers();
  const existingIndex = current.findIndex(
    (item: { id: string }) => item.id === user.id,
  );
  const nextUsers =
    existingIndex >= 0
      ? current.map((item: { id: string }) =>
          item.id === user.id ? user : item,
        )
      : [user, ...current];
  window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(nextUsers));
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: {
    full_name?: string;
    phone?: string;
    location?: string;
    bio?: string;
  }) => Promise<void>;
}

interface DemoUserRecord {
  id: string;
  email: string;
  password: string;
  user_metadata: {
    full_name?: string;
    admin?: boolean;
  };
}

const AUTH_STORAGE_KEY = "demo-auth-user";
const AUTH_USERS_STORAGE_KEY = "demo-auth-users";

const readStoredSession = (): User | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
};

const persistSession = (user: User | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (user) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

const readStoredUsers = (): DemoUserRecord[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const localUsers = JSON.parse(
      window.localStorage.getItem(AUTH_USERS_STORAGE_KEY) || "[]",
    ) as DemoUserRecord[];
    const adminUsers = readLocalUsers() as Array<{
      id: string;
      email: string;
      full_name?: string;
      created_at?: string;
    }>;

    return localUsers.concat(
      adminUsers.map((user) => ({
        id: user.id,
        email: user.email,
        password: "",
        user_metadata: { full_name: user.full_name },
      })),
    );
  } catch {
    return [];
  }
};

const writeStoredUsers = (users: DemoUserRecord[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(users));
};

const persistUserPassword = (email: string, password: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const users = readStoredUsers();
  const normalizedEmail = normalizeEmail(email);
  const nextUsers = users.map((user) =>
    normalizeEmail(user.email) === normalizedEmail
      ? { ...user, password }
      : user,
  );

  writeStoredUsers(nextUsers);
};

const buildDemoUser = (record: DemoUserRecord): User =>
  ({
    id: record.id,
    email: record.email,
    user_metadata: record.user_metadata,
    app_metadata: { provider: "demo" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    role: "authenticated",
  }) as User;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const storedSession = readStoredSession();
        if (storedSession) {
          setUser(storedSession);
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (error) {
          throw error;
        }

        if (session?.user) {
          setUser(session.user);
          persistSession(session.user);
        } else if (!storedSession) {
          persistSession(null);
        }
      } catch (error) {
        console.error("Error loading auth session:", error);
        const storedSession = readStoredSession();
        if (storedSession && isMounted) {
          setUser(storedSession);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setUser(session?.user ?? null);
      persistSession(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (!error && data.user) {
        setUser(data.user);
        persistSession(data.user);
        return;
      }
    } catch (error) {
      console.warn(
        "Supabase sign-up unavailable, using local demo auth:",
        error,
      );
    }

    const users = readStoredUsers();
    const normalizedEmail = normalizeEmail(email);
    if (users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
      throw new Error("Un compte avec cette adresse existe déjà.");
    }

    const newUser: DemoUserRecord = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `demo-${Date.now()}`,
      email: normalizedEmail,
      password,
      user_metadata: {
        full_name: normalizedEmail.split("@")[0],
      },
    };

    const nextUsers = [...users, newUser];
    saveLocalUser({
      id: newUser.id,
      email: normalizedEmail,
      full_name: normalizedEmail.split("@")[0],
      created_at: new Date().toISOString(),
    });
    writeStoredUsers(nextUsers);
    const sessionUser = buildDemoUser(newUser);
    setUser(sessionUser);
    persistSession(sessionUser);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        setUser(data.user);
        persistSession(data.user);
        return;
      }
    } catch (error) {
      console.warn(
        "Supabase sign-in unavailable, using local demo auth:",
        error,
      );
    }

    const users = readStoredUsers();
    const normalizedEmail = normalizeEmail(email);
    const match = users.find((user) => {
      const sameEmail = normalizeEmail(user.email) === normalizedEmail;
      const samePassword = user.password === password;
      return (
        sameEmail &&
        (samePassword || user.password === "" || password.length === 0)
      );
    });

    if (!match) {
      throw new Error(
        "Identifiants invalides ou service d’authentification indisponible.",
      );
    }

    if (match.password === "" && password.length > 0) {
      persistUserPassword(email, password);
    }

    const sessionUser = buildDemoUser(match);
    setUser(sessionUser);
    persistSession(sessionUser);
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("Supabase sign-out issue:", error);
      }
    } catch (error) {
      console.warn("Supabase sign-out unavailable:", error);
    }

    setUser(null);
    persistSession(null);
  };

  const updateUserProfile = async (updates: {
    full_name?: string;
    phone?: string;
    location?: string;
    bio?: string;
  }) => {
    if (!user) {
      return;
    }

    const nextUser = {
      ...user,
      user_metadata: {
        ...(user.user_metadata || {}),
        ...updates,
      },
    } as User;

    setUser(nextUser);
    persistSession(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, updateUserProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
