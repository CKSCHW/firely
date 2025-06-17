
"use client";

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import type { Playlist, ContentItem } from '@/lib/types';
import { mockPlaylists, mockDevices, availableContentItems } from '@/data/mockData';
import { ArrowLeftCircle, ArrowRightCircle, Loader2, AlertTriangle, EyeOff, Tv2, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';

async function getPlaylistForDisplay(displayId: string): Promise<Playlist | null> {
  await new Promise(resolve => setTimeout(resolve, 100)); 
  
  const device = mockDevices.find(d => d.id === displayId);
  if (!device || !device.currentPlaylistId) return null;
  
  const playlistFromMock = mockPlaylists.find(p => p.id === device.currentPlaylistId);
  if (!playlistFromMock) return null;

  const populatedItems = playlistFromMock.items.map(itemRef => {
    // Ensure we get the full item object from availableContentItems
    return availableContentItems.find(ci => ci.id === itemRef.id);
  }).filter(Boolean) as ContentItem[];

  return { ...playlistFromMock, items: populatedItems };
}


export default function DisplayPage({ params }: { params: { displayId: string } }) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false); 
  const [contentError, setContentError] = useState<string | null>(null); // For individual content item errors

  const fetchAndSetPlaylist = useCallback(async () => {
    setLoading(true);
    setError(null);
    setContentError(null);
    try {
      const data = await getPlaylistForDisplay(params.displayId);
      if (data && data.items.length > 0) {
        setPlaylist(data);
        setCurrentItemIndex(0); 
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

  const advanceToNextItem = useCallback(() => {
    if (!playlist || playlist.items.length === 0) return;
    setCurrentItemIndex((prevIndex) => (prevIndex + 1) % playlist.items.length);
    setContentError(null); // Clear previous content error
  }, [playlist]);

  useEffect(() => {
    if (!playlist || playlist.items.length === 0 || isPaused || loading || error || contentError) return;

    const currentItem = playlist.items[currentItemIndex];
    const duration = (currentItem.duration || 10) * 1000;

    const timer = setTimeout(() => {
      advanceToNextItem();
    }, duration);

    return () => clearTimeout(timer);
  }, [currentItemIndex, playlist, isPaused, loading, error, contentError, advanceToNextItem]);

  const navigate = (direction: 'next' | 'prev') => {
    if (!playlist || playlist.items.length === 0) return;
    setIsPaused(true); 
    setContentError(null);
    setCurrentItemIndex(prevIndex => {
      const newIndex = direction === 'next' 
        ? (prevIndex + 1) % playlist.items.length
        : (prevIndex - 1 + playlist.items.length) % playlist.items.length;
      return newIndex;
    });
    setTimeout(() => setIsPaused(false), 5000); 
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

  const renderContentItem = (item: ContentItem) => {
    if (contentError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black text-yellow-400 p-4">
          <FileWarning className="w-16 h-16 mb-4" />
          <p className="text-xl font-semibold">Content Error</p>
          <p>{contentError}</p>
          <p className="text-sm mt-2">Skipping to next item in {item.duration}s...</p>
        </div>
      );
    }

    switch (item.type) {
      case 'image':
        return item.url ? (
          <Image
            key={item.id}
            src={item.url}
            alt={item.title || `Display Content ${currentItemIndex + 1}`}
            fill={true}
            style={{ objectFit: "contain" }}
            quality={90}
            priority
            className="animate-fadeIn"
            data-ai-hint={item.dataAiHint || "signage image"}
            onError={() => setContentError(`Failed to load image: ${item.title || 'Untitled'}`)}
          />
        ) : <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white"><FileWarning className="w-12 h-12 mr-2"/>Image URL missing</div>;
      case 'video':
        return item.url ? (
          <video
            key={item.id}
            src={item.url}
            autoPlay
            muted
            loop // Consider making loop configurable per item
            className="w-full h-full object-contain animate-fadeIn"
            onError={() => setContentError(`Failed to load video: ${item.title || 'Untitled'}`)}
          />
        ) : <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white"><FileWarning className="w-12 h-12 mr-2"/>Video URL missing</div>;
      case 'web':
      case 'pdf': // PDFs are often rendered in iframes like web pages
        return item.url ? (
          <iframe
            key={item.id}
            src={item.url}
            title={item.title || `Display Content ${currentItemIndex + 1}`}
            className="w-full h-full border-0 animate-fadeIn"
            sandbox="allow-scripts allow-same-origin allow-popups" // Adjust sandbox as needed for security
            onError={() => setContentError(`Failed to load ${item.type} content: ${item.title || 'Untitled'}`)}
          />
        ) : <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white"><FileWarning className="w-12 h-12 mr-2"/>{item.type} URL missing</div>;
      default:
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700 text-yellow-300 p-4">
            <Tv2 className="w-16 h-16 mb-4" />
            <p className="text-xl">Unsupported content type: {item.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none group" role="main" aria-label="Digital Signage Display">
      {renderContentItem(currentItem)}
      
      <button 
        onClick={() => navigate('prev')} 
        aria-label="Previous Item"
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/20 text-white/70 rounded-full hover:bg-black/40 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <ArrowLeftCircle size={28} />
      </button>
      <button 
        onClick={() => navigate('next')}
        aria-label="Next Item"
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/20 text-white/70 rounded-full hover:bg-black/40 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <ArrowRightCircle size={28} />
      </button>

      {currentItem.title && !contentError && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent text-white p-4 md:p-6 z-10 pointer-events-none">
          <p className="text-lg md:text-xl font-headline drop-shadow-md">{currentItem.title}</p>
        </div>
      )}
      
      <div className="absolute top-0 left-0 h-1.5 bg-accent/70 z-20" style={{ width: `${((currentItemIndex + 1) / playlist.items.length) * 100}%`, transition: 'width 0.5s ease-in-out' }}></div>
    </div>
  );
}
