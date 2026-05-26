import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Database } from "../lib/database.types";
import {
  getListingImageUrls,
  serializeListingImageUrls,
} from "../lib/listingImages";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Listing = Database["public"]["Tables"]["listings"]["Row"];

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingListing?: Listing | null;
}

export function CreateListingModal({
  isOpen,
  onClose,
  onSuccess,
  editingListing = null,
}: CreateListingModalProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category_id: "",
    location: "",
    image_url: "",
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (editingListing) {
        setFormData({
          title: editingListing.title,
          description: editingListing.description || "",
          price: editingListing.price ? editingListing.price.toString() : "",
          category_id: editingListing.category_id || "",
          location: editingListing.location || "",
          image_url: "",
        });
        setImageUrls(getListingImageUrls(editingListing));
      } else {
        setFormData({
          title: "",
          description: "",
          price: "",
          category_id: "",
          location: "",
          image_url: "",
        });
        setImageUrls([]);
      }
      setImageFiles([]);
    }
  }, [isOpen, editingListing]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    try {
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from("listings-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("listings-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Validate file type
        if (!file.type.startsWith("image/")) {
          alert(`${file.name}: Veuillez sélectionner un fichier image`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name}: L'image doit faire moins de 5MB`);
          continue;
        }

        newFiles.push(file);
      }
      const totalImages =
        imageFiles.length + imageUrls.length + newFiles.length;
      if (totalImages > 6) {
        alert("Vous pouvez ajouter entre 3 et 6 images au maximum");
        return;
      }
      setImageFiles([...imageFiles, ...newFiles]);
    }
  };

  const removeImageFile = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      let allImageUrls: string[] = [...imageUrls];
      const selectedImageCount = imageUrls.length + imageFiles.length;

      if (selectedImageCount < 3 || selectedImageCount > 6) {
        alert("Veuillez ajouter entre 3 et 6 images à votre annonce");
        setLoading(false);
        return;
      }

      if (imageFiles.length > 0) {
        setUploading(true);
        for (const file of imageFiles) {
          const url = await uploadImageToStorage(file);
          allImageUrls.push(url);
        }
        setUploading(false);
      }

      if (allImageUrls.length < 3 || allImageUrls.length > 6) {
        alert("Veuillez ajouter entre 3 et 6 images à votre annonce");
        setLoading(false);
        return;
      }

      const serializedImageUrl = serializeListingImageUrls(allImageUrls);

      if (editingListing) {
        const { error } = await supabase
          .from("listings")
          .update({
            title: formData.title,
            description: formData.description,
            price: formData.price ? parseFloat(formData.price) : null,
            category_id: formData.category_id || null,
            location: formData.location || null,
            image_url: serializedImageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingListing.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("listings").insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          price: formData.price ? parseFloat(formData.price) : null,
          category_id: formData.category_id || null,
          location: formData.location || null,
          image_url: serializedImageUrl,
          status: "active",
        });

        if (error) throw error;
      }

      setFormData({
        title: "",
        description: "",
        price: "",
        category_id: "",
        location: "",
        image_url: "",
      });
      setImageFiles([]);
      setImageUrls([]);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving listing:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite";
      alert(`Erreur lors de la sauvegarde de l'annonce: ${errorMessage}`);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-8 p-6 relative max-h-[calc(100vh-4rem)] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-6">
          {editingListing ? "Modifier l'annonce" : "Publier une annonce"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={5}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix (€)
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Localisation
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ville, région..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images (entre 3 et 6) <span className="text-red-500">*</span>
            </label>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Télécharger des images (entre 3 et 6 requises)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max 5MB par image - JPG, PNG, WebP - Entre 3 et 6 images
                  requises
                </p>
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  Images sélectionnées: {imageFiles.length + imageUrls.length} /
                  entre 3 et 6 requises
                </div>
              </div>

              {/* Affichage des fichiers en attente de téléchargement */}
              {imageFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Fichiers à télécharger ({imageFiles.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {imageFiles.map((file, index) => (
                      <div
                        key={index}
                        className="relative bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center justify-between"
                      >
                        <span className="text-xs text-gray-600 truncate">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImageFile(index)}
                          className="ml-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Affichage des URLs d'images */}
              {imageUrls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Images téléchargées ({imageUrls.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {imageUrls.map((url, index) => (
                      <div
                        key={index}
                        className="relative bg-gray-100 rounded-lg overflow-hidden group"
                      >
                        <img
                          src={url}
                          alt={`Image ${index + 1}`}
                          className="w-full h-24 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImageUrl(index)}
                          className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-6 h-6 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OU</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Ajouter une URL d'image externe
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) =>
                      setFormData({ ...formData, image_url: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://exemple.com/image.jpg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (imageFiles.length + imageUrls.length >= 6) {
                        alert(
                          "Vous pouvez ajouter entre 3 et 6 images au maximum",
                        );
                        return;
                      }

                      if (
                        formData.image_url &&
                        !imageUrls.includes(formData.image_url)
                      ) {
                        setImageUrls([...imageUrls, formData.image_url]);
                        setFormData({ ...formData, image_url: "" });
                      }
                    }}
                    disabled={!formData.image_url}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading
                ? "Téléchargement de l'image..."
                : loading
                  ? "Enregistrement..."
                  : editingListing
                    ? "Modifier l'annonce"
                    : "Publier l'annonce"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
