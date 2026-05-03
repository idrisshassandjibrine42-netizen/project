import { MapPin, Calendar } from "lucide-react";
import { Database } from "../lib/database.types";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

interface ListingCardProps {
  listing: Listing;
  onClick: () => void;
}

export function ListingCard({ listing, onClick }: ListingCardProps) {
  const formatPrice = (price: number | null) => {
    if (price === null) return "Prix non spécifié";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="aspect-video bg-white overflow-hidden border border-gray-300 rounded-lg">
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span>Pas d'image</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">
          {listing.title}
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {listing.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-blue-600 font-bold text-lg">
            {formatPrice(listing.price)}
          </span>
          {listing.status === "sold" && (
            <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
              Vendu
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          {listing.location && (
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3" />
              <span>{listing.location}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(listing.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
