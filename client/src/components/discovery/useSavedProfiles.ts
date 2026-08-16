import { useCallback, useEffect, useState } from "react";

/**
 * Local-first saved companions (M1). The list lives in localStorage and every
 * instance of this hook stays in sync through a window event; moving the
 * collection into the database is a planned milestone.
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

export function useSavedProfiles() {
  const [saved, setSaved] = useState<string[]>(read);

  useEffect(() => {
    const sync = () => setSaved(read());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((slug: string) => {
    const next = read().includes(slug) ? read().filter(item => item !== slug) : [...read(), slug];
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // A full or blocked localStorage simply means the save does not persist.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const isSaved = useCallback((slug: string) => saved.includes(slug), [saved]);

  return { saved, toggle, isSaved };
}
