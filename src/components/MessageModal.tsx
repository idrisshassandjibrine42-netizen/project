import { X, Send } from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface MessageModalProps {
  listingId: string;
  receiverId: string;
  receiverEmail: string;
  listingTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MessageModal({
  listingId,
  receiverId,
  receiverEmail,
  listingTitle,
  onClose,
  onSuccess,
}: MessageModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSendMessage = async () => {
    if (!message.trim()) {
      setError("Le message ne peut pas être vide");
      return;
    }

    if (!user) {
      setError("Vous devez être connecté pour envoyer un message");
      return;
    }

    try {
      setSending(true);
      setError("");

      const { error: insertError } = await supabase.from("messages").insert([
        {
          listing_id: listingId,
          sender_id: user.id,
          receiver_id: receiverId,
          content: message,
          is_read: false,
        },
      ]);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Envoyer un message
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Annonce:</strong> {listingTitle}
            </p>
            <p className="text-sm text-gray-600">
              <strong>À:</strong> {receiverEmail}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Votre message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez votre message ici..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
