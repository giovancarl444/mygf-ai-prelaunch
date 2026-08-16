import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useState } from "react";

/**
 * Saved companions. Signed-in members get the account-owned list from the
 * database; a signed-out visitor keeps a local list in the browser so the
 * bookmark still feels real before an account exists. The interface is the
 * same either way, so no page has to care which store is behind it.
 */
const STORAGE_KEY = "mygf-saved-companions";
const CHANGE_EVENT = "mygf-saved-companions-changed";

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((slug): slug is string => typeof slug === "string") : [];
  } catch {
    return [];
  }
}

function writeLocal(next: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // A full or blocked localStorage simply means the save does not persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useSavedProfiles() {
  const { isAuthenticated } = useAuth();
  const serverList = trpc.collection.list.useQuery(undefined, { enabled: isAuthenticated });
  const toggleMutation = trpc.collection.toggle.useMutation();
  const utils = trpc.useUtils();

  const [localSaved, setLocalSaved] = useState<string[]>(read);

  useEffect(() => {
    const sync = () => setLocalSaved(read());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const saved = isAuthenticated && serverList.data ? serverList.data.worldSlugs : localSaved;

  const toggle = useCallback((slug: string) => {
    if (isAuthenticated) {
      toggleMutation.mutate(
        { worldSlug: slug },
        { onSettled: () => void utils.collection.list.invalidate() },
      );
      return;
    }
    writeLocal(read().includes(slug) ? read().filter(item => item !== slug) : [...read(), slug]);
  }, [isAuthenticated, toggleMutation, utils]);

  const isSaved = useCallback((slug: string) => saved.includes(slug), [saved]);

  return { saved, toggle, isSaved };
}
