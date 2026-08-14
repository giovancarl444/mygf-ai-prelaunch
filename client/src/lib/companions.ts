export type PublicCompanion = {
  worldSlug: string;
  displayName: string;
  age: number | null;
  occupation: string | null;
  profileImageUrl: string | null;
  tagline: string | null;
  providerType: "ORIGINAL" | "DIGITAL_TWIN" | null;
};

export type CompanionAgeFilter = "Any age" | "18–24" | "25–34" | "35+";

export const companionAgeFilters: CompanionAgeFilter[] = ["Any age", "18–24", "25–34", "35+"];

function matchesAge(age: number | null, filter: CompanionAgeFilter) {
  if (filter === "Any age") return true;
  if (age === null) return false;
  if (filter === "18–24") return age <= 24;
  if (filter === "25–34") return age >= 25 && age <= 34;
  return age >= 35;
}

export function filterCompanions(
  companions: readonly PublicCompanion[],
  filters: { query: string; age: CompanionAgeFilter },
): PublicCompanion[] {
  const query = filters.query.trim().toLowerCase();

  return companions.filter(companion => {
    if (!matchesAge(companion.age, filters.age)) return false;
    if (!query) return true;
    return [companion.displayName, companion.occupation, companion.tagline]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}
