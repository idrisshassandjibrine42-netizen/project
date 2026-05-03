import { Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Database } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];

interface MessageWithNames extends Message {
  senderName?: string;
  receiverName?: string;
}

export function MessagesPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchCurrentUserProfile();
    fetchMessages();
  }, [user]);

  const fetchCurrentUserProfile = async () => {
    if (!user) return;

    try {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("full_name,email")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setCurrentUserName(
        profile?.full_name || profile?.email || user.email || "Utilisateur",
      );
    } catch (err) {
      console.error("Error fetching current user profile:", err);
      setCurrentUserName(user.email || "Utilisateur");
    }
  };

  const fetchMessages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError("");

      // Get messages where user is sender or receiver
      const { data, error: fetchError } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch user profiles to get names
      if (data && data.length > 0) {
        // Get unique user IDs
        const userIds = new Set<string>();
        data.forEach((msg) => {
          userIds.add(msg.sender_id);
          userIds.add(msg.receiver_id);
        });

        // Fetch all user profiles
        const { data: profiles, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .in("id", Array.from(userIds));

        if (profileError) throw profileError;

        // Create a map of userId -> profile
        const profileMap = new Map<string, UserProfile>();
        profiles?.forEach((profile) => {
          profileMap.set(profile.id, profile);
        });

        // Add names to messages
        const messagesWithNames = data.map((msg) => ({
          ...msg,
          senderName:
            profileMap.get(msg.sender_id)?.full_name ||
            profileMap.get(msg.sender_id)?.email ||
            msg.sender_id.slice(0, 8),
          receiverName:
            profileMap.get(msg.receiver_id)?.full_name ||
            profileMap.get(msg.receiver_id)?.email ||
            msg.receiver_id.slice(0, 8),
        }));

        setMessages(messagesWithNames);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Erreur lors du chargement des messages");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("id", messageId);

      if (error) throw error;
      fetchMessages();
    } catch (err) {
      console.error("Error marking message as read:", err);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce message ?")) return;

    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
      fetchMessages();
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const filteredMessages = messages.filter(
    (msg) =>
      msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.senderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.receiverName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-600">
          Veuillez vous connecter pour voir vos messages
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Mes messages
            </h2>
            <p className="text-sm text-gray-500">
              Connecté en tant que {currentUserName || user.email}
            </p>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher des messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement des messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm
              ? "Aucun message trouvé"
              : "Vous n'avez pas encore de messages"}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg border ${
                  !message.is_read
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {message.sender_id === user.id ? "Vous → " : ""}
                      {message.sender_id === user.id
                        ? message.receiverName
                        : message.senderName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(message.created_at).toLocaleDateString(
                        "fr-FR",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMessage(message.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-gray-700 text-sm mb-3">{message.content}</p>

                {!message.is_read && message.receiver_id === user.id && (
                  <button
                    onClick={() => markAsRead(message.id)}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    Marquer comme lu
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
