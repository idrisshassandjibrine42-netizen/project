import { X, ShoppingCart, AlertCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface BuyModalProps {
  listingId: string;
  listingTitle: string;
  listingPrice: number | null;
  sellerEmail: string;
  sellerId: string;
  onClose: () => void;
}

export function BuyModal({
  listingId,
  listingTitle,
  listingPrice,
  sellerEmail,
  sellerId,
  onClose,
}: BuyModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"confirm" | "success">("confirm");
  const [loading, setLoading] = useState(false);

  const formatPrice = (price: number | null) => {
    if (price === null) return "Prix non spécifié";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const handlePurchase = async () => {
    if (!user) {
      alert("Vous devez être connecté pour acheter");
      return;
    }

    try {
      setLoading(true);

      // Create purchase record
      const { error } = await supabase.from("purchases").insert([
        {
          listing_id: listingId,
          buyer_id: user.id,
          seller_id: sellerId,
          amount: listingPrice,
          status: "pending",
        },
      ]);

      if (error) throw error;

      setStep("success");
    } catch (error) {
      console.error("Error processing purchase:", error);
      alert("Erreur lors du traitement de l'achat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {step === "confirm" ? (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Confirmer l'achat
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  Après achat, vous pouvez contacter le vendeur pour convenir
                  des modalités de livraison.
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Annonce:</strong>
                  </p>
                  <p className="text-gray-900 font-medium">{listingTitle}</p>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600">Prix:</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatPrice(listingPrice)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">
                    <strong>Vendeur:</strong>
                  </p>
                  <p className="text-sm text-gray-900">{sellerEmail}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {loading ? "Traitement..." : "Acheter"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Achat confirmé
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium text-center">
                  ✓ Achat confirmé avec succès!
                </p>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  Vous avez acheté <strong>{listingTitle}</strong> pour{" "}
                  <strong>{formatPrice(listingPrice)}</strong>.
                </p>
                <p>Un email de confirmation a été envoyé à {user?.email}.</p>
                <p className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                  <strong>Prochaine étape:</strong> Contactez le vendeur pour
                  convenir des modalités de livraison et de paiement.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Fermer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
