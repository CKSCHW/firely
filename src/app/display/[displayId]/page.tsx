"use client";

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import type { Playlist, ContentItem } from '@/lib/types';
import { mockPlaylists, mockDevices, availableContentItems } from '@/data/mockData';
import { ArrowLeftCircle, ArrowRightCircle, Loader2, AlertTriangle, EyeOff } from 'lucide-react';

async function getPlaylistForDisplay(displayId: string): Promise<Playlist | null> {
  // Simulate API call or data lookup
  // In a real app, this would be a server action or API fetch
  await new Promise(resolve => setTimeout(resolve, 100)); 
  
  const device = mockDevices.find(d => d.id === displayId);
  if (!device || !device.currentPlaylistId) return null;
  
  const playlistFromMock = mockPlaylists.find(p => p.id === device.currentPlaylistId);
  if (!playlistFromMock) return null;

  // Ensure playlist items are fully populated, not just IDs
  // This logic assumes playlistFromMock.items contains full ContentItem objects as per mockData structure
  const populatedItems = playlistFromMock.items.map(item => {
    // If items were just IDs, you would look them up in availableContentItems here.
    // For our mockData, item is already a ContentItem.
    return availableContentItems.find(ci => ci.id === item.id) || item;
  }).filter(Boolean) as ContentItem[];

  return { ...playlistFromMock, items: populatedItems };
}


export default function DisplayPage({ params }: { params: { displayId: string } }) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false); // For manual navigation pause

  const fetchAndSetPlaylist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlaylistForDisplay(params.displayId);
      if (data && data.items.length > 0) {
        setPlaylist(data);
        setCurrentItemIndex(0); // Reset index when new playlist loads
      } else if (data && data.items.length === 0) {
        setError("Playlist is empty. Please add content.");
      } else {
        setError("Playlist not found or display not configured.");
      }
    } catch (e) {
      setError("Failed to load playlist. Check network or configuration.");
    } finally {
      setLoading(false);
    }
  }, [params.displayId]);


  useEffect(() => {
    fetchAndSetPlaylist();
  }, [fetchAndSetPlaylist]);

  useEffect(() => {
    if (!playlist || playlist.items.length === 0 || isPaused || loading || error) return;

    const currentItem = playlist.items[currentItemIndex];
    const duration = (currentItem.duration || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentItemIndex((prevIndex) => (prevIndex + 1) % playlist.items.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentItemIndex, playlist, isPaused, loading, error]);

  const navigate = (direction: 'next' | 'prev') => {
    if (!playlist || playlist.items.length === 0) return;
    setIsPaused(true); // Pause slideshow on manual navigation
    setCurrentItemIndex(prevIndex => {
      const newIndex = direction === 'next' 
        ? (prevIndex + 1) % playlist.items.length
        : (prevIndex - 1 + playlist.items.length) % playlist.items.length;
      return newIndex;
    });
    // Optionally resume after a delay
    setTimeout(() => setIsPaused(false), 5000); // Resume after 5s of inactivity
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-20 h-20 animate-spin text-accent mb-6" />
        <p className="mt-4 text-3xl font-headline tracking-wide">Loading Display Content...</p>
        <p className="font-body text-slate-400 text-lg">Firefly Signage</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-red-900 flex flex-col items-center justify-center text-red-100 p-8 text-center">
        <AlertTriangle className="w-24 h-24 text-red-300 mb-6" />
        <p className="mt-4 text-4xl font-headline">{error}</p>
        <p className="font-body mt-3 text-lg text-red-200">Please check the display configuration in the admin panel or contact support.</p>
        <Button onClick={fetchAndSetPlaylist} variant="outline" className="mt-8 text-red-100 border-red-300 hover:bg-red-800 hover:text-red-50">
          Retry Loading
        </Button>
        <p className="font-body text-red-400 text-sm mt-12">Firefly Signage Error</p>
      </div>
    );
  }
  
  if (!playlist || playlist.items.length === 0) {
     return (
      <div className="fixed inset-0 bg-gray-800 flex flex-col items-center justify-center text-slate-300 p-8 text-center">
        <EyeOff className="w-24 h-24 text-slate-500 mb-6" />
        <p className="mt-4 text-3xl font-headline">No Content to Display</p>
        <p className="font-body text-slate-400 mt-2 text-lg">The assigned playlist is empty or could not be loaded.</p>
        <p className="font-body text-slate-500 text-sm mt-10">Firefly Signage</p>
      </div>
    );
  }

  const currentItem = playlist.items[currentItemIndex];

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none" role="main" aria-label="Digital Signage Display">
      {currentItem.type === 'image' && currentItem.url && (
        <Image
          key={currentItem.id} // Add key for re-triggering animation on change
          src={currentItem.url}
          alt={currentItem.title || `Display Content ${currentItemIndex + 1}`}
          fill={true}
          style={{ objectFit: "contain" }} // Using style prop for fill with objectFit
          quality={90} // Adjusted quality
          priority // Prioritize loading the current image
          className="animate-fadeIn"
          data-ai-hint={currentItem.dataAiHint || "signage image"}
        />
      )}
      
      {/* Navigation controls (subtle, for testing or specific use cases) */}
      <button 
        onClick={() => navigate('prev')} 
        aria-label="Previous Item"
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/20 text-white/70 rounded-full hover:bg-black/40 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
      >
        <ArrowLeftCircle size={28} />
      </button>
      <button 
        onClick={() => navigate('next')}
        aria-label="Next Item"
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/20 text-white/70 rounded-full hover:bg-black/40 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
      >
        <ArrowRightCircle size={28} />
      </button>

      {/* Overlay for item title (optional) */}
      {currentItem.title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent text-white p-4 md:p-6 z-10 pointer-events-none">
          <p className="text-lg md:text-xl font-headline drop-shadow-md">{currentItem.title}</p>
        </div>
      )}
      
      {/* Progress bar (optional) */}
      <div className="absolute top-0 left-0 h-1.5 bg-accent/70 z-20" style={{ width: `${((currentItemIndex + 1) / playlist.items.length) * 100}%`, transition: 'width 0.5s ease-in-out' }}></div>
    </div>
  );
}
