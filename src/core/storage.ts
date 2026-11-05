import { City, parseCity } from "./model";
export const storageKey = "cleancity.scenarios.v1";
export function loadLibrary(storage: Pick<Storage, "getItem">): City[] {
  const raw = storage.getItem(storageKey);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > 50)
    throw Error("Invalid scenario library");
  return data.map((c) => parseCity(JSON.stringify(c)));
}
export function saveLibrary(storage: Pick<Storage, "setItem">, cities: City[]) {
  if (cities.length > 50)
    throw Error("Maximum 50 saved cities. Export or delete one first.");
  cities.forEach((c) => parseCity(JSON.stringify(c)));
  storage.setItem(storageKey, JSON.stringify(cities));
}
