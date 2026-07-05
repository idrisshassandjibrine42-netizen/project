import type { Database } from "./database.types";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

const LOCAL_LISTINGS_KEY = "demo-listings";

export function readLocalListings(): Listing[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(LOCAL_LISTINGS_KEY);
    return stored ? (JSON.parse(stored) as Listing[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalListings(listings: Listing[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_LISTINGS_KEY, JSON.stringify(listings));
}

export function saveLocalListing(listing: Listing) {
  const current = readLocalListings();
  const existingIndex = current.findIndex((item) => item.id === listing.id);

  const nextListings =
    existingIndex >= 0
      ? current.map((item) => (item.id === listing.id ? listing : item))
      : [listing, ...current];

  writeLocalListings(nextListings);
  return listing;
}

export function updateLocalListing(
  listingId: string,
  updates: Partial<Listing>,
) {
  const current = readLocalListings();
  const existingIndex = current.findIndex((item) => item.id === listingId);

  if (existingIndex < 0) {
    return null;
  }

  const updatedListing = {
    ...current[existingIndex],
    ...updates,
    updated_at: new Date().toISOString(),
  } as Listing;

  const nextListings = current.map((item) =>
    item.id === listingId ? updatedListing : item,
  );

  writeLocalListings(nextListings);
  return updatedListing;
}

export function deleteLocalListing(listingId: string) {
  const current = readLocalListings();
  const nextListings = current.filter((item) => item.id !== listingId);
  writeLocalListings(nextListings);
  return nextListings;
}

export function clearDemoUserLocalListings() {
  const current = readLocalListings();
  const nextListings = current.filter((item) => {
    const normalized = (item.user_id || "").trim().toLowerCase();
    return !["#demo-user", "#demo-use", "demo-user", "demo-use"].includes(
      normalized,
    );
  });
  writeLocalListings(nextListings);
  return nextListings;
}
