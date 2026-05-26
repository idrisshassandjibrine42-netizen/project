import { Database } from "./database.types";

type ListingImageSource = Pick<
  Database["public"]["Tables"]["listings"]["Row"],
  "image_url" | "image_urls"
>;

export function getListingImageUrls(listing: ListingImageSource): string[] {
  if (Array.isArray(listing.image_urls) && listing.image_urls.length > 0) {
    return listing.image_urls;
  }

  if (!listing.image_url) {
    return [];
  }

  try {
    const parsed = JSON.parse(listing.image_url);

    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    ) {
      return parsed.filter((item) => item.length > 0);
    }

    if (typeof parsed === "string" && parsed.length > 0) {
      return [parsed];
    }
  } catch {
    // fallback to treating the value as a single image URL
  }

  return [listing.image_url];
}

export function serializeListingImageUrls(imageUrls: string[]): string | null {
  if (imageUrls.length === 0) {
    return null;
  }

  if (imageUrls.length === 1) {
    return imageUrls[0];
  }

  return JSON.stringify(imageUrls);
}
