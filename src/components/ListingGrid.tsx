import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Database } from "../lib/database.types";
import {
  clearDemoUserLocalListings,
  readLocalListings,
} from "../lib/localListings";
import { ListingCard } from "./ListingCard";
import { ListingDetails } from "./ListingDetails";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

interface ListingGridProps {
  categoryId: string | null;
  refreshTrigger?: number;
  userListingsOnly?: boolean;
  searchTerm?: string;
  onEditListing?: (listing: Listing) => void;
}

export function ListingGrid({
  categoryId,
  refreshTrigger,
  userListingsOnly,
  searchTerm,
  onEditListing,
}: ListingGridProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const localListings = clearDemoUserLocalListings();
      const fallbackTimer = window.setTimeout(() => {
        setListings(localListings);
        setLoading(false);
      }, 50);

      let query = supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (!userListingsOnly) {
        query = query.eq("status", "active");
      }

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      if (searchTerm && searchTerm.trim().length > 0) {
        const trimmed = searchTerm.trim();
        query = query.or(
          `title.ilike.%${trimmed}%,description.ilike.%${trimmed}%`,
        );
      }

      if (userListingsOnly) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          query = query.eq("user_id", user.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      const remoteListings = ((data || []) as Listing[]).filter((listing) => {
        const normalized = (listing.user_id || "").trim().toLowerCase();
        return !["#demo-user", "#demo-use", "demo-user", "demo-use"].includes(
          normalized,
        );
      });
      const filteredLocalListings = localListings.filter((listing) => {
        const normalized = (listing.user_id || "").trim().toLowerCase();
        if (
          ["#demo-user", "#demo-use", "demo-user", "demo-use"].includes(
            normalized,
          )
        ) {
          return false;
        }
        if (userListingsOnly) {
          return true;
        }
        if (listing.status !== "active") {
          return false;
        }
        if (!categoryId) {
          return true;
        }
        return listing.category_id === categoryId;
      });
      const combinedListings = [...remoteListings, ...filteredLocalListings];
      const uniqueListings = combinedListings.filter(
        (listing, index, self) =>
          index === self.findIndex((item) => item.id === listing.id),
      );
      setListings(uniqueListings);
    } catch (error) {
      console.error("Error loading listings:", error);
      const localListings = clearDemoUserLocalListings();
      const filteredLocalListings = localListings.filter((listing) => {
        if (userListingsOnly) {
          return true;
        }
        if (listing.status !== "active") {
          return false;
        }
        if (!categoryId) {
          return true;
        }
        return listing.category_id === categoryId;
      });
      setListings(filteredLocalListings);
    } finally {
      setLoading(false);
    }
  }, [categoryId, userListingsOnly, searchTerm]);

  useEffect(() => {
    loadListings();
  }, [loadListings, refreshTrigger]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          {userListingsOnly
            ? "Vous n'avez pas encore publié d'annonces."
            : "Aucune annonce trouvée."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onClick={() => setSelectedListing(listing)}
            onEdit={
              userListingsOnly && onEditListing
                ? () => onEditListing(listing)
                : undefined
            }
          />
        ))}
      </div>

      {selectedListing && (
        <ListingDetails
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onUpdate={loadListings}
        />
      )}
    </>
  );
}
