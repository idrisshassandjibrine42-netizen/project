import { useState } from "react";
import { Search } from "lucide-react";
import { Header } from "./components/Header";
import { CategoryFilter } from "./components/CategoryFilter";
import { ListingGrid } from "./components/ListingGrid";
import { CreateListingModal } from "./components/CreateListingModal";
import { MessagesPanel } from "./components/MessagesPanel";
import { ProfileManager } from "./components/ProfileManager";
import { AdminDashboard } from "./components/AdminDashboard";
import { useAuth } from "./contexts/AuthContext";
import { Database } from "./lib/database.types";

type View = "home" | "my-listings" | "messages" | "profile" | "admin";
type Listing = Database["public"]["Tables"]["listings"]["Row"];

function App() {
  const { user, loading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentView, setCurrentView] = useState<View>("home");

  const handleCreateClick = () => {
    if (!user) {
      alert("Veuillez vous connecter pour publier une annonce");
      return;
    }
    setCreateModalOpen(true);
  };

  const handleListingCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setCreateModalOpen(true);
  };

  const handleModalClose = () => {
    setCreateModalOpen(false);
    setEditingListing(null);
  };

  const handleMyListingsClick = () => {
    setCurrentView("my-listings");
    setSelectedCategory(null);
  };

  const handleHomeClick = () => {
    setCurrentView("home");
    setSelectedCategory(null);
  };
  const handleMessagesClick = () => {
    setCurrentView("messages");
    setSelectedCategory(null);
  };

  const handleProfileClick = () => {
    setCurrentView("profile");
    setSelectedCategory(null);
  };

  const handleAdminClick = () => {
    setCurrentView("admin");
    setSelectedCategory(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onCreateClick={handleCreateClick}
        onMyListingsClick={handleMyListingsClick}
        onHomeClick={handleHomeClick}
        onMessagesClick={handleMessagesClick}
        onProfileClick={handleProfileClick}
        onAdminClick={handleAdminClick}
        currentView={currentView}
        isAdmin={Boolean(
          user &&
          (user.email === import.meta.env.VITE_ADMIN_EMAIL ||
            user.user_metadata?.admin === true),
        )}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Profil connecté</p>
            <h2 className="text-xl font-semibold text-gray-900">
              {user.email?.split("@")[0] || user.email}
            </h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        )}

        {currentView === "home" ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Découvrez les annonces
              </h2>
              <p className="text-gray-600">
                Trouvez ce que vous cherchez parmi des milliers d'annonces
              </p>
            </div>

            <div className="mb-6 space-y-4">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher une annonce..."
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              </div>
            </div>

            <ListingGrid
              categoryId={selectedCategory}
              refreshTrigger={refreshTrigger}
              searchTerm={searchTerm}
            />
          </>
        ) : currentView === "my-listings" ? (
          <>
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Mes annonces
                  </h2>
                  <p className="text-gray-600">Gérez vos annonces publiées</p>
                </div>
                <button
                  onClick={handleHomeClick}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  ← Retour à Découvrez les annonces
                </button>
              </div>
            </div>

            <ListingGrid
              categoryId={null}
              refreshTrigger={refreshTrigger}
              userListingsOnly={true}
              onEditListing={handleEditListing}
            />
          </>
        ) : currentView === "messages" ? (
          <>
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Mes messages
                  </h2>
                  <p className="text-gray-600">
                    Consultez vos conversations avec les acheteurs et vendeurs
                  </p>
                </div>
                <button
                  onClick={handleHomeClick}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  ← Retour à Découvrez les annonces
                </button>
              </div>
            </div>

            <MessagesPanel />
          </>
        ) : currentView === "admin" ? (
          <>
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Tableau de bord administrateur
                  </h2>
                  <p className="text-gray-600">
                    Gérez les utilisateurs et les annonces depuis un seul
                    endroit
                  </p>
                </div>
                <button
                  onClick={handleHomeClick}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  ← Retour à Découvrez les annonces
                </button>
              </div>
            </div>

            {user ? (
              <AdminDashboard />
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
                <p className="font-semibold">Accès refusé</p>
                <p>
                  Vous devez être connecté en tant qu'administrateur pour voir
                  ce tableau de bord.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Gérer mon profil
                  </h2>
                  <p className="text-gray-600">
                    Mettez à jour vos informations personnelles
                  </p>
                </div>
                <button
                  onClick={handleHomeClick}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  ← Retour à Découvrez les annonces
                </button>
              </div>
            </div>

            <ProfileManager />
          </>
        )}
      </main>

      <CreateListingModal
        isOpen={createModalOpen}
        onClose={handleModalClose}
        onSuccess={handleListingCreated}
        editingListing={editingListing}
      />
    </div>
  );
}

export default App;
