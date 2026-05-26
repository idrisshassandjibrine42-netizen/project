import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Database } from "../lib/database.types";
import { Save, AlertCircle } from "lucide-react";

type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];

export function ProfileManager() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If table doesn't exist or other error, just use auth metadata
        console.log(
          "Profile load error (table might not exist):",
          error.message,
        );
        if (user.user_metadata?.full_name) {
          setFullName(user.user_metadata.full_name);
        }
        return;
      }

      if (data) {
        const profile = data as UserProfile;
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setLocation(profile.location || "");
        setBio(profile.bio || "");
      } else if (user.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Fallback to auth metadata
      if (user.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfileToDatabase = async (profileData: any) => {
    // Helper function to bypass TypeScript issues with user_profiles table
    // TODO: Fix TypeScript types once Supabase types are properly generated

    // First try to insert
    const { error } = await (supabase.from("user_profiles") as any).insert(
      profileData,
    );

    if (error) {
      console.log("Insert failed, trying upsert:", error.message);
      // If insert fails, try upsert (table might already exist)
      const { error: upsertError } = await (
        supabase.from("user_profiles") as any
      ).upsert(profileData, {
        onConflict: "user_id",
        returning: "minimal",
      });

      if (upsertError) {
        throw upsertError;
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (authError) {
        console.error("Auth update error:", authError);
        // Continue anyway, this is not critical
      }

      // Try to upsert profile data
      const profileData = {
        user_id: user.id,
        full_name: fullName,
        phone,
        location,
        bio,
        updated_at: new Date().toISOString(),
      };

      console.log("Attempting to save profile:", profileData);

      await saveProfileToDatabase(profileData);

      console.log("Profile saved successfully");

      setMessage({
        type: "success",
        text: "Profil mis à jour avec succès",
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Profile save error:", error);

      // Check if it's a table not found error
      if (
        error instanceof Error &&
        error.message.includes("relation") &&
        error.message.includes("does not exist")
      ) {
        setMessage({
          type: "error",
          text: "La table des profils n'existe pas encore. Veuillez contacter l'administrateur pour appliquer les migrations.",
        });
      } else {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erreur lors de la mise à jour du profil";
        setMessage({
          type: "error",
          text: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Informations personnelles
        </h3>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
              message.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <AlertCircle
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                message.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            />
            <p
              className={`text-sm ${
                message.type === "success" ? "text-green-700" : "text-red-700"
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email (non-modifiable)
            </label>
            <input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nom complet
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Votre nom complet"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Téléphone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Localisation
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ville, Région"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>

          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Bio / Description
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Parlez un peu de vous..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>
              {loading ? "Enregistrement..." : "Enregistrer les modifications"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
