import { useState } from "react";
import { Plus, User, LogOut, Menu, X, MessageSquare } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { AuthModal } from "./AuthModal";

interface HeaderProps {
  onCreateClick: () => void;
  onMyListingsClick: () => void;
  onHomeClick: () => void;
  onMessagesClick: () => void;
}

export function Header({
  onCreateClick,
  onMyListingsClick,
  onHomeClick,
  onMessagesClick,
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleAuthClick = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={onHomeClick}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                Annonces
              </h1>
            </button>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {user && (
                <button
                  onClick={onCreateClick}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Publier</span>
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {menuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    {user ? (
                      <>
                        <button
                          onClick={() => {
                            onMyListingsClick();
                            setMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <User className="w-4 h-4" />
                          <span>Mes annonces</span>
                        </button>
                        <button
                          onClick={() => {
                            onMessagesClick();
                            setMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Messages</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 text-red-600"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Déconnexion</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleAuthClick("login")}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          Connexion
                        </button>
                        <button
                          onClick={() => handleAuthClick("register")}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          Inscription
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
      />
    </>
  );
}
