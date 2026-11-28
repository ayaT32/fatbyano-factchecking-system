import { useEffect, useState } from "react";
import { SupabaseSource } from "./supabase-source";
import type { FactCheckRun, FactCheckSource, SessionSummary } from "./types";

let source: FactCheckSource | undefined;

/** The source the screens read from: the Supabase archive that DEFAME writes (DECISIONS.md #25). */
export function getSource(): FactCheckSource {
  source ??= new SupabaseSource();
  return source;
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  useEffect(() => getSource().subscribeSessions(setSessions), []);
  return sessions;
}

/** `undefined` while loading, `null` if the run doesn't exist (or can't be read). */
export function useRun(id: string | undefined) {
  const [run, setRun] = useState<FactCheckRun | null | undefined>(undefined);
  useEffect(() => {
    if (!id) {
      setRun(null);
      return;
    }
    setRun(undefined);
    return getSource().subscribeRun(id, setRun);
  }, [id]);
  return run;
}
