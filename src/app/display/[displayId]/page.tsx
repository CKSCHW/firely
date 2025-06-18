
"use client";

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import type { Playlist, ContentItem, DisplayDevice, ScheduleEntry } from '@/lib/types';
import { mockPlaylists, mockDevices, availableContentItems, ensureDataLoaded } from '@/data/mockData';
import { ArrowLeftCircle, ArrowRightCircle, Loader2, AlertTriangle, EyeOff, Tv2, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';


function timeToMinutes(timeStr: string): number { // HH:MM
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

async function getActivePlaylistForDisplay(displayId: string): Promise<Playlist | null> {
  await ensureDataLoaded(); 
  
  const device = mockDevices.find(d => d.id === displayId);
  if (!device) return null;

  let activePlaylistId: string | undefined = device.currentPlaylistId; // Start with fallback

  if (device.schedule && device.schedule.length > 0) {
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sunday) - 6 (Saturday)
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    for (const entry of device.schedule) {
      if (entry.daysOfWeek.includes(currentDay)) {
        const startTimeInMinutes = timeToMinutes(entry.startTime);
        const endTimeInMinutes = timeToMinutes(entry.endTime);
        if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes) {
          activePlaylistId = entry.playlistId;
          break; // Found an active scheduled playlist
        }
      }
    }
  }
  
  if (!activePlaylistId) return null; // No fallback and no active schedule

  const playlistFromMock = mockPlaylists.find(p => p.id === activePlaylistId);
  if (!playlistFromMock) return null;

  const populatedItems = playlistFromMock.items.map(itemRefOrItem => {
    const fullItem = availableContentItems.find(ci => ci.id === (typeof itemRefOrItem === 'string' ? itemRefOrItem : itemRefOrItem.id));
    return fullItem;
  }).filter(Boolean) as ContentItem[];


  return { ...playlistFromMock, items: populatedItems };
}


export default function DisplayPage({ params }: { params: { displayId: string } }) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false); 
  const [contentError, setContentError] = useState<string | null>(null);

  const fetchAndSetPlaylist = useCallback(async () => {
    setLoading(true);
    setError(null);
    setContentError(null);
    try {
      const data = await getActivePlaylistForDisplay(params.displayId);
      if (data && data.items.length > 0) {
        setPlaylist(data);
        setCurrentItemIndex(0); 
      } else if (data && data.items.length === 0) {
        setError("Active playlist is empty. Please add content or check schedule.");
      } else {
        const deviceExists = mockDevices.some(d => d.id === params.displayId);
        if (!deviceExists) {
          setError("Display ID not found. Cannot load playlist.");
        } else {
           setError("No active playlist found. Check device schedule and fallback configuration.");
        }
      }
    } catch (e) {
      console.error("Error fetching playlist data:", e);
      setError("Failed to load playlist. Check network or configuration.");
    } finally {
      setLoading(false);
    }
  }, [params.displayId]);


  useEffect(() => {
    fetchAndSetPlaylist();
    // Set up an interval to re-check the active playlist periodically (e.g., every minute)
    // This ensures the display updates if a new schedule entry becomes active
    const scheduleCheckInterval = setInterval(fetchAndSetPlaylist, 60 * 1000); 
    return () => clearInterval(scheduleCheckInterval);
  }, [fetchAndSetPlaylist]);

  const advanceToNextItem = useCallback(() => {
    if (!playlist || playlist.items.length === 0) return;
    setCurrentItemIndex((prevIndex) => (prevIndex + 1) % playlist.items.length);
    setContentError(null); 
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
        <p className="font-body text-slate-400 mt-2 text-lg">No playlist is currently scheduled or the active playlist is empty.</p>
        <Button onClick={fetchAndSetPlaylist} variant="outline" className="mt-8 text-slate-300 border-slate-500 hover:bg-gray-700 hover:text-slate-100">
          Retry Loading
        </Button>
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
          <p className="text-sm mt-2">Skipping to next item in {item.duration || 10}s...</p>
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
            unoptimized={item.url.startsWith("https://placehold.co") || item.url.startsWith('blob:') || item.url.startsWith('/uploads/')}
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
            loop 
            className="w-full h-full object-contain animate-fadeIn"
            onError={() => setContentError(`Failed to load video: ${item.title || 'Untitled'}`)}
          />
        ) : <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white"><FileWarning className="w-12 h-12 mr-2"/>Video URL missing</div>;
      case 'web':
      case 'pdf': 
        return item.url ? (
          <iframe
            key={item.id}
            src={item.url}
            title={item.title || `Display Content ${currentItemIndex + 1}`}
            className="w-full h-full border-0 animate-fadeIn"
            sandbox="allow-scripts allow-same-origin allow-popups" 
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
