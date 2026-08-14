export type WorldCategory = "All" | "Reflective" | "Story" | "Imaginative" | "Curious";
export type AgeFilter = "Any age" | "21–24" | "25–29" | "30+";
export type EnergyFilter = "All energy" | "Bright" | "Grounded" | "Composed" | "Adventurous";

export type CatalogWorld = {
  name: string;
  age: number;
  category: Exclude<WorldCategory, "All">;
  energy: Exclude<EnergyFilter, "All energy">;
  mood: string;
  tag: string;
};

export type CatalogFilters = {
  category: WorldCategory;
  age: AgeFilter;
  energy: EnergyFilter;
  query: string;
};

function matchesAge(age: number, filter: AgeFilter) {
  if (filter === "Any age") return true;
  if (filter === "21–24") return age >= 21 && age <= 24;
  if (filter === "25–29") return age >= 25 && age <= 29;
  return age >= 30;
}

export function filterCatalogWorlds<T extends CatalogWorld>(worlds: readonly T[], filters: CatalogFilters): T[] {
  const query = filters.query.trim().toLowerCase();

  return worlds.filter(world => {
    const categoryMatches = filters.category === "All" || world.category === filters.category;
    const ageMatches = matchesAge(world.age, filters.age);
    const energyMatches = filters.energy === "All energy" || world.energy === filters.energy;
    const queryMatches = !query || [world.name, world.mood, world.tag, world.category, world.energy].join(" ").toLowerCase().includes(query);
    return categoryMatches && ageMatches && energyMatches && queryMatches;
  });
}
