import { useState } from "react";
import { Header } from "./components/Header";
import { CategoryFilter } from "./components/CategoryFilter";
import { ListingGrid } from "./components/ListingGrid";
import { CreateListingModal } from "./components/CreateListingModal";
import { MessagesPanel } from "./components/MessagesPanel";
import { useAuth } from "./contexts/AuthContext";

type View = "home" | "my-listings" | "messages";

function App() {
  const { user, loading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
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

            <div className="mb-6">
              <CategoryFilter
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            <ListingGrid
              categoryId={selectedCategory}
              refreshTrigger={refreshTrigger}
            />
          </>
        ) : currentView === "my-listings" ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Mes annonces
              </h2>
              <p className="text-gray-600">Gérez vos annonces publiées</p>
            </div>

            <ListingGrid
              categoryId={null}
              refreshTrigger={refreshTrigger}
              userListingsOnly={true}
            />
          </>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Mes messages
              </h2>
              <p className="text-gray-600">
                Consultez vos conversations avec les acheteurs et vendeurs
              </p>
            </div>

            <MessagesPanel />
          </>
        )}
      </main>

      <CreateListingModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleListingCreated}
      />
    </div>
  );
}

export default App;
