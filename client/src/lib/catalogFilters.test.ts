import { describe, expect, it } from "vitest";
import { filterCatalogWorlds, type CatalogWorld } from "./catalogFilters";

const worlds: CatalogWorld[] = [
  { name: "Sienna Vale", age: 24, category: "Curious", energy: "Bright", mood: "Bright and observant", tag: "Soft Signal" },
  { name: "Marisol Hart", age: 29, category: "Reflective", energy: "Grounded", mood: "Measured and warm", tag: "Night Window" },
  { name: "Camille Rowan", age: 32, category: "Reflective", energy: "Composed", mood: "Candid and quietly funny", tag: "Sunday Edit" },
];

describe("filterCatalogWorlds", () => {
  it("combines category, age, energy, and search filters", () => {
    const result = filterCatalogWorlds(worlds, {
      category: "Reflective",
      age: "25–29",
      energy: "Grounded",
      query: "night",
    });

    expect(result.map(world => world.name)).toEqual(["Marisol Hart"]);
  });

  it("returns all worlds for default filters and no worlds for an unmatched query", () => {
    expect(filterCatalogWorlds(worlds, { category: "All", age: "Any age", energy: "All energy", query: "" })).toHaveLength(3);
    expect(filterCatalogWorlds(worlds, { category: "All", age: "Any age", energy: "All energy", query: "ocean" })).toEqual([]);
  });
});
