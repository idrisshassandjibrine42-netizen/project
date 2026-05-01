import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { ListingCard } from './ListingCard';
import { ListingDetails } from './ListingDetails';

type Listing = Database['public']['Tables']['listings']['Row'];

interface ListingGridProps {
  categoryId: string | null;
  refreshTrigger?: number;
  userListingsOnly?: boolean;
}

export function ListingGrid({ categoryId, refreshTrigger, userListingsOnly }: ListingGridProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  useEffect(() => {
    loadListings();
  }, [categoryId, refreshTrigger, userListingsOnly]);

  const loadListings = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!userListingsOnly) {
        query = query.eq('status', 'active');
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (userListingsOnly) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq('user_id', user.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          {userListingsOnly ? 'Vous n\'avez pas encore publié d\'annonces.' : 'Aucune annonce trouvée.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onClick={() => setSelectedListing(listing)}
          />
        ))}
      </div>

      {selectedListing && (
        <ListingDetails
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onUpdate={loadListings}
        />
      )}
    </>
  );
}
