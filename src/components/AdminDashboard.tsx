import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Database } from "../lib/database.types";
import {
  RefreshCw,
  ShieldCheck,
  Users,
  ListChecks,
  Archive,
  Trash2,
} from "lucide-react";

type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
type Listing = Database["public"]["Tables"]["listings"]["Row"];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const statusLabel = (status: Listing["status"]) => {
  switch (status) {
    case "active":
      return "Active";
    case "sold":
      return "Vendue";
    case "archived":
      return "Archivée";
    default:
      return status;
  }
};

export function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userActionMessage, setUserActionMessage] = useState<string | null>(
    null,
  );
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersResponse, listingsResponse] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("listings")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (usersResponse.error) {
        throw usersResponse.error;
      }
      if (listingsResponse.error) {
        throw listingsResponse.error;
      }

      setUsers(usersResponse.data || []);
      setListings(listingsResponse.data || []);
    } catch (err) {
      console.error("AdminDashboard error", err);
      setError(
        "Impossible de charger les données. Vérifiez les autorisations Supabase.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const query = search.toLowerCase();
    return users.filter(
      (user) =>
        (user.email?.toLowerCase().includes(query) ?? false) ||
        (user.full_name?.toLowerCase().includes(query) ?? false),
    );
  }, [search, users]);

  const filteredListings = useMemo(() => {
    if (!search.trim()) return listings;
    const query = search.toLowerCase();
    return listings.filter(
      (listing) =>
        listing.title.toLowerCase().includes(query) ||
        listing.description.toLowerCase().includes(query) ||
        listing.location?.toLowerCase().includes(query) ||
        listing.user_id.toLowerCase().includes(query),
    );
  }, [search, listings]);

  const refresh = () => setRefreshTrigger((prev) => prev + 1);

  const updateListingStatus = async (
    listingId: string,
    status: Listing["status"],
  ) => {
    setError(null);
    const { error: updateError } = await supabase
      .from("listings")
      .update({ status })
      .eq("id", listingId);

    if (updateError) {
      setError(
        "Action non autorisée ou impossible. Vérifiez les permissions Supabase.",
      );
      return;
    }

    refresh();
  };

  const deleteListing = async (listingId: string) => {
    setError(null);
    const { error: deleteError } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);
    if (deleteError) {
      setError("Suppression impossible. Vérifiez les permissions Supabase.");
      return;
    }
    refresh();
  };

  const createUserAccount = async () => {
    setError(null);
    setUserActionMessage(null);
    setCreatingUser(true);

    try {
      const currentSessionResponse = await supabase.auth.getSession();
      const currentSession = currentSessionResponse.data.session;

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: newUserEmail,
          password: newUserPassword,
        });

      if (signUpError) {
        throw signUpError;
      }

      const createdUser = signUpData?.user;
      if (currentSession?.access_token && currentSession?.refresh_token) {
        const { error: restoreError } = await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });

        if (restoreError) {
          console.warn(
            "Impossible de restaurer la session admin",
            restoreError,
          );
        }
      }

      if (createdUser?.id) {
        const profileInsert: Database["public"]["Tables"]["user_profiles"]["Insert"] =
          {
            id: createdUser.id,
            email: newUserEmail,
            full_name: newUserEmail.split("@")[0],
          };

        const { error: profileError } = await supabase
          .from("user_profiles")
          .insert(profileInsert);

        if (profileError) {
          throw profileError;
        }
      }

      setNewUserEmail("");
      setNewUserPassword("");
      setUserActionMessage("Compte utilisateur créé avec succès.");
      refresh();
    } catch (err) {
      console.error("AdminDashboard createUserAccount error", err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer le compte utilisateur.",
      );
    } finally {
      setCreatingUser(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setError(null);
    setUserActionMessage(null);

    try {
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      if (messagesError) {
        throw messagesError;
      }

      const { error: purchasesError } = await supabase
        .from("purchases")
        .delete()
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
      if (purchasesError) {
        throw purchasesError;
      }

      const { error: listingsError } = await supabase
        .from("listings")
        .delete()
        .eq("user_id", userId);
      if (listingsError) {
        throw listingsError;
      }

      const { error: profileError } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", userId);
      if (profileError) {
        throw profileError;
      }

      setUserActionMessage("Utilisateur et données associées supprimés.");
      refresh();
    } catch (err) {
      console.error("AdminDashboard deleteUser error", err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de supprimer l'utilisateur.",
      );
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Tableau de bord
            </h3>
            <p className="text-sm text-gray-500">
              Chargement des utilisateurs et des annonces…
            </p>
          </div>
          <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-12 rounded-2xl bg-gray-200 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Vue d’ensemble
              </h3>
              <p className="text-sm text-gray-500">
                Utilisateurs et annonces en temps réel
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-sm uppercase tracking-[0.2em] text-blue-600">
                Utilisateurs
              </p>
              <p className="mt-3 text-3xl font-semibold text-blue-900">
                {users.length}
              </p>
            </div>
            <div className="rounded-2xl bg-green-50 p-4">
              <p className="text-sm uppercase tracking-[0.2em] text-green-700">
                Annonces
              </p>
              <p className="mt-3 text-3xl font-semibold text-green-900">
                {listings.length}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm uppercase tracking-[0.2em] text-gray-600">
                Archive / vendues
              </p>
              <p className="mt-3 text-3xl font-semibold text-gray-900">
                {listings.filter((item) => item.status !== "active").length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Recherche globale
              </p>
              <p className="text-sm text-gray-500">
                Filtrer par utilisateur, email ou annonce
              </p>
            </div>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" /> Actualiser
            </button>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher..."
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Créer un compte utilisateur
            </h3>
            <p className="text-sm text-gray-500">
              Créez un compte Supabase avec email et mot de passe.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(event) => setNewUserEmail(event.target.value)}
              placeholder="utilisateur@example.com"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(event) => setNewUserPassword(event.target.value)}
              placeholder="Au moins 6 caractères"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Note: l’utilisateur sera créé dans Supabase et un profil sera
            ajouté.
          </p>
          <button
            onClick={createUserAccount}
            disabled={
              creatingUser || !newUserEmail || newUserPassword.length < 6
            }
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creatingUser ? "Création..." : "Créer le compte"}
          </button>
        </div>

        {userActionMessage && (
          <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-800">
            {userActionMessage}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-indigo-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Utilisateurs
            </h3>
            <p className="text-sm text-gray-500">
              Informations de profil et email
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Créé le</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">{profile.full_name || "—"}</td>
                  <td className="px-4 py-4 break-all">{profile.email}</td>
                  <td className="px-4 py-4">
                    {formatDate(profile.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => deleteUser(profile.id)}
                      className="inline-flex items-center rounded-2xl border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <ListChecks className="h-6 w-6 text-emerald-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Annonces</h3>
            <p className="text-sm text-gray-500">
              Statut, propriétaire et actions rapides
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Propriétaire</th>
                <th className="px-4 py-3">Créé le</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredListings.map((listing) => (
                <tr key={listing.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">{listing.title}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {statusLabel(listing.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 break-all">{listing.user_id}</td>
                  <td className="px-4 py-4">
                    {formatDate(listing.created_at)}
                  </td>
                  <td className="px-4 py-4 space-x-2">
                    <button
                      onClick={() => updateListingStatus(listing.id, "active")}
                      className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Archive className="mr-1 h-3.5 w-3.5" />
                      Active
                    </button>
                    <button
                      onClick={() =>
                        updateListingStatus(listing.id, "archived")
                      }
                      className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Archive className="mr-1 h-3.5 w-3.5" />
                      Archiver
                    </button>
                    <button
                      onClick={() => deleteListing(listing.id)}
                      className="inline-flex items-center rounded-2xl border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {filteredListings.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Aucune annonce trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
