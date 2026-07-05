import { useEffect, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "register";
}

export function AuthModal({
  isOpen,
  onClose,
  mode: initialMode,
}: AuthModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError("");
      setEmail("");
      setPassword("");
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      onClose();
      setEmail("");
      setPassword("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(
        message.includes("Failed to fetch") || message.includes("fetch")
          ? "Le service d’authentification est actuellement indisponible. Vérifiez votre connexion Internet."
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-6">
          {mode === "login" ? "Connexion" : "Inscription"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Chargement..."
              : mode === "login"
                ? "Se connecter"
                : "S'inscrire"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <p className="text-gray-600">
              Pas encore de compte ?{" "}
              <button
                onClick={() => setMode("register")}
                className="text-blue-600 hover:underline"
              >
                Créer un compte
              </button>
            </p>
          ) : (
            <p className="text-gray-600">
              Déjà inscrit ?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-blue-600 hover:underline"
              >
                Se connecter
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
