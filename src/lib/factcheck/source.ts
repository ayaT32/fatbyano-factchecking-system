import { useEffect, useState } from "react";
import { DemoSource } from "./demo-source";
import type { FactCheckRun, FactCheckSource, SessionSummary } from "./types";

let source: FactCheckSource | undefined;

/** The source the screens read from. Only the demo source exists so far; a Supabase
 * Realtime source replaces it once DEFAME writes runs to Supabase (decision #3). */
export function getSource(): FactCheckSource {
  source ??= new DemoSource();
  return source;
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  useEffect(() => getSource().subscribeSessions(setSessions), []);
  return sessions;
}

/** `undefined` while loading, `null` if the run doesn't exist. */
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
