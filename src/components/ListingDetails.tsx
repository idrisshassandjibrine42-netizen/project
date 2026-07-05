import {
  X,
  MapPin,
  Calendar,
  Trash2,
  ShoppingCart,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Database } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { MessageModal } from "./MessageModal";
import { BuyModal } from "./BuyModal";
import { getListingImageUrls } from "../lib/listingImages";
import { deleteLocalListing, updateLocalListing } from "../lib/localListings";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

interface ListingDetailsProps {
  listing: Listing;
  onClose: () => void;
  onUpdate: () => void;
}

export function ListingDetails({
  listing,
  onClose,
  onUpdate,
}: ListingDetailsProps) {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [sellerEmail, setSellerEmail] = useState<string | null>(null);
  const [loadingSellerInfo, setLoadingSellerInfo] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const isOwner = user?.id === listing.user_id;
  const allImages = getListingImageUrls(listing);

  useEffect(() => {
    const fetchSellerEmail = async () => {
      if (isOwner || !listing.user_id) return;

      try {
        setLoadingSellerInfo(true);

        // Get user profile from user_profiles table
        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("full_name, email")
          .eq("id", listing.user_id)
          .single();

        if (error) throw error;

        const displayName =
          profile?.full_name ||
          profile?.email ||
          `Vendeur #${listing.user_id.slice(0, 8)}`;
        setSellerEmail(displayName);
      } catch (error) {
        console.error("Error fetching seller info:", error);
        setSellerEmail(`Vendeur #${listing.user_id.slice(0, 8)}`);
      } finally {
        setLoadingSellerInfo(false);
      }
    };

    fetchSellerEmail();
  }, [listing, isOwner]);

  // Fallback: try to get name from user metadata
  useEffect(() => {
    if (!isOwner && !sellerEmail && listing.user_id) {
      // This is a fallback - in production you might want a separate users table
      setSellerEmail(`Vendeur #${listing.user_id.slice(0, 8)}`);
    }
  }, [listing.user_id, isOwner, sellerEmail]);

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
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette annonce ?")) return;

    try {
      setDeleting(true);
      deleteLocalListing(listing.id);

      try {
        const { error } = await supabase
          .from("listings")
          .delete()
          .eq("id", listing.id);

        if (error) throw error;
      } catch (error) {
        console.warn("Supabase delete failed, local deletion applied:", error);
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (
    newStatus: "active" | "sold" | "archived",
  ) => {
    try {
      updateLocalListing(listing.id, {
        status: newStatus,
        updated_at: new Date().toISOString(),
      });

      try {
        const { error } = await supabase
          .from("listings")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", listing.id);

        if (error) throw error;
      } catch (error) {
        console.warn(
          "Supabase status update failed, local update applied:",
          error,
        );
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Erreur lors de la mise à jour");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8 relative max-h-[calc(100vh-4rem)] overflow-y-auto flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="aspect-video bg-white rounded-t-lg overflow-hidden max-h-96 flex-shrink-0 border border-gray-300 relative">
          {allImages.length > 0 ? (
            <div className="relative w-full h-full">
              <img
                src={allImages[currentImageIndex]}
                alt={`${listing.title} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-contain"
              />

              {/* Navigation arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentImageIndex(
                        (prev) =>
                          (prev - 1 + allImages.length) % allImages.length,
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all"
                    title="Image précédente"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentImageIndex(
                        (prev) => (prev + 1) % allImages.length,
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all"
                    title="Image suivante"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Image counter */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {allImages.length}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span>Pas d'image</span>
            </div>
          )}
        </div>

        {/* Image thumbnails */}
        {allImages.length > 1 && (
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 overflow-x-auto">
            <div className="flex gap-2">
              {allImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                    index === currentImageIndex
                      ? "border-blue-500"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  title={`Image ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {listing.title}
              </h2>
              <div className="text-blue-600 font-bold text-2xl">
                {formatPrice(listing.price)}
              </div>
            </div>
            {listing.status === "sold" && (
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg font-medium">
                Vendu
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
            {listing.location && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{listing.location}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(listing.created_at)}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="font-semibold text-lg mb-3">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {listing.description}
            </p>
          </div>

          {!isOwner && listing.status === "active" && (
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="font-semibold text-lg mb-3">Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowBuyModal(true)}
                  disabled={!user}
                  className="flex-1 min-w-[200px] px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  title={!user ? "Vous devez être connecté pour acheter" : ""}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Acheter
                </button>
                <button
                  onClick={() => setShowMessageModal(true)}
                  disabled={!user}
                  className="flex-1 min-w-[200px] px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  title={
                    !user
                      ? "Vous devez être connecté pour envoyer un message"
                      : ""
                  }
                >
                  <MessageSquare className="w-5 h-5" />
                  Contacter le vendeur
                </button>
              </div>
            </div>
          )}
          {isOwner && (
            <div className="border-t border-gray-200 pt-6 space-y-3">
              <h3 className="font-semibold text-lg mb-3">Gérer l'annonce</h3>

              <div className="flex flex-wrap gap-2">
                {listing.status === "active" && (
                  <button
                    onClick={() => handleStatusChange("sold")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Marquer comme vendu
                  </button>
                )}
                {listing.status === "sold" && (
                  <button
                    onClick={() => handleStatusChange("active")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Remettre en vente
                  </button>
                )}
                {listing.status === "archived" && (
                  <button
                    onClick={() => handleStatusChange("active")}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Désarchiver
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleting ? "Suppression..." : "Supprimer"}</span>
                </button>
                {listing.status !== "archived" && (
                  <button
                    onClick={() => handleStatusChange("archived")}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Archiver
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showMessageModal && sellerEmail && (
        <MessageModal
          listingId={listing.id}
          receiverId={listing.user_id}
          receiverEmail={sellerEmail}
          listingTitle={listing.title}
          onClose={() => setShowMessageModal(false)}
          onSuccess={onUpdate}
        />
      )}

      {showBuyModal && sellerEmail && (
        <BuyModal
          listingId={listing.id}
          listingTitle={listing.title}
          listingPrice={listing.price}
          sellerEmail={sellerEmail}
          sellerId={listing.user_id}
          onClose={() => setShowBuyModal(false)}
        />
      )}
    </div>
  );
}
