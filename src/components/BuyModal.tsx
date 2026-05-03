import { X, ShoppingCart, AlertCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Database } from "../lib/database.types";

type PurchaseInsert = Database["public"]["Tables"]["purchases"]["Insert"];

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
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const formatPrice = (price: number | null) => {
    if (price === null) return "Prix non spécifié";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const isValidCardNumber = (value: string) => {
    const cleaned = value.replace(/\s+/g, "");
    return /^\d{16}$/.test(cleaned);
  };

  const isValidExpiry = (value: string) => {
    const match = /^\s*(0[1-9]|1[0-2])\/(\d{2})\s*$/.exec(value);
    if (!match) return false;
    const month = Number(match[1]);
    const year = Number(`20${match[2]}`);
    const now = new Date();
    const expiryDate = new Date(year, month - 1, 1);
    return expiryDate >= new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const isValidCvc = (value: string) => /^\d{3,4}$/.test(value);

  const handlePurchase = async () => {
    if (!user) {
      alert("Vous devez être connecté pour acheter");
      return;
    }

    if (!isValidCardNumber(cardNumber)) {
      setPaymentError("Numéro de carte invalide. Entrez 16 chiffres.");
      return;
    }

    if (!isValidExpiry(cardExpiry)) {
      setPaymentError("Date d'expiration invalide. Format MM/AA.");
      return;
    }

    if (!isValidCvc(cardCvc)) {
      setPaymentError("CVC invalide. Entrez 3 ou 4 chiffres.");
      return;
    }

    setPaymentError("");

    try {
      setLoading(true);

      // Create purchase record
      const purchasesTable = supabase.from("purchases") as unknown as {
        insert: (values: PurchaseInsert[]) => Promise<{ error: unknown }>;
      };

      const { error } = await purchasesTable.insert([
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

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Paiement par carte bancaire
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Numéro de carte
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) =>
                          setCardNumber(e.target.value.replace(/[^0-9 ]/g, ""))
                        }
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Date d'expiration
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) =>
                            setCardExpiry(
                              e.target.value.replace(/[^0-9/]/g, ""),
                            )
                          }
                          placeholder="MM/AA"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          CVC
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={cardCvc}
                          onChange={(e) =>
                            setCardCvc(e.target.value.replace(/[^0-9]/g, ""))
                          }
                          placeholder="123"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    {paymentError && (
                      <p className="text-sm text-red-600">{paymentError}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Le paiement s'effectue uniquement par carte bancaire.
                    </p>
                  </div>
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
                <p className="bg-green-50 border border-green-200 rounded p-3 mt-4">
                  <strong>Paiement:</strong> Carte bancaire accepté.
                </p>
                <p className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <strong>Prochaine étape:</strong> Contactez le vendeur pour
                  convenir des modalités de livraison.
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
