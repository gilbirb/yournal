import { useEffect, useState } from "react";
import { supabase } from "../api/supabase";
import { setToken } from "../api/client";

export function useSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setToken(s?.access_token ?? null);
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  return session;
}