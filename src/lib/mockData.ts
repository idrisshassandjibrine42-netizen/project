import type { Database } from "./database.types";

export const mockCategories: Database["public"]["Tables"]["categories"]["Row"][] =
  [
    {
      id: "cat-1",
      name: "Voitures",
      slug: "voitures",
      icon: "Car",
      created_at: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "cat-2",
      name: "Immobilier",
      slug: "immobilier",
      icon: "Home",
      created_at: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "cat-3",
      name: "Électronique",
      slug: "electronique",
      icon: "Smartphone",
      created_at: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "cat-4",
      name: "Mode",
      slug: "mode",
      icon: "Shirt",
      created_at: "2024-01-01T00:00:00.000Z",
    },
  ];

export const mockListings: Database["public"]["Tables"]["listings"]["Row"][] = [
  {
    id: "listing-4",
    user_id: "another-user",
    category_id: "cat-4",
    title: "Veste en cuir occasion",
    description: "Veste élégante et confortable.",
    price: 75,
    image_url: null,
    image_urls: [],
    location: "Bordeaux",
    status: "active",
    created_at: "2024-02-13T10:00:00.000Z",
    updated_at: "2024-02-13T10:00:00.000Z",
  },
];
