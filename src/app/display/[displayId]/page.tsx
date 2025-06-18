
"use client";

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import type { Playlist, ContentItem, DisplayDevice, ScheduleEntry } from '@/lib/types';
import { mockPlaylists, mockDevices, availableContentItems, ensureDataLoaded } from '@/data/mockData';
import { ArrowLeftCircle, ArrowRightCircle, Loader2, AlertTriangle, EyeOff, Tv2, FileWarning, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateDeviceHeartbeatAction } from '@/app/admin/devices/actions';
import { useParams } from 'next/navigation';


function timeToMinutes(timeStr: string): number { // HH:MM
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0; // Handle invalid time format
  return hours * 60 + minutes;
}

async function getActivePlaylistForDisplay(displayId: string): Promise<Playlist | null> {
  await ensureDataLoaded(); 
  
  const device = mockDevices.find(d => d.id === displayId);
  if (!device) {
    console.error(`[Display ${displayId}] Device configuration not found.`);
    return null;
  }

  let activePlaylistId: string | undefined = device.currentPlaylistId; 

  if (device.schedule && device.schedule.length > 0) {
    const now = new Date();
    const currentDay = now.getDay(); 
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    const sortedSchedule = [...device.schedule].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    for (const entry of sortedSchedule) {
      if (entry.daysOfWeek.includes(currentDay)) {
        const startTimeInMinutes = timeToMinutes(entry.startTime);
        const endTimeInMinutes = timeToMinutes(entry.endTime);
        
        if (endTimeInMinutes < startTimeInMinutes) { 
             console.warn(`[Display ${displayId}] Schedule entry ${entry.id} for playlist ${entry.playlistId} has end time before start time. Skipping.`);
             continue;
        }
        if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes) {
          activePlaylistId = entry.playlistId;
          console.log(`[Display ${displayId}] Active schedule found: Playlist ${activePlaylistId} for entry ${entry.id}`);
          break; 
        }
      }
    }
  }
  
  if (!activePlaylistId) {
    console.log(`[Display ${displayId}] No active schedule or fallback playlist ID found.`);
    return null;
  }
  console.log(`[Display ${displayId}] Determined active playlist ID: ${activePlaylistId}`);

  const playlistFromMock = mockPlaylists.find(p => p.id === activePlaylistId);
  if (!playlistFromMock) {
    console.error(`[Display ${displayId}] Playlist with ID ${activePlaylistId} not found in mockPlaylists.`);
    return null;
  }

  const populatedItems = playlistFromMock.items.map(itemRefOrItem => {
    const fullItem = availableContentItems.find(ci => ci.id === (typeof itemRefOrItem === 'string' ? itemRefOrItem : itemRefOrItem.id));
    if (!fullItem) {
      console.warn(`[Display ${displayId}] Content item with ID ${(typeof itemRefOrItem === 'string' ? itemRefOrItem : itemRefOrItem.id)} not found for playlist ${activePlaylistId}.`);
    }
    return fullItem;
  }).filter(Boolean) as ContentItem[];


  return { ...playlistFromMock, items: populatedItems };
}


export default function DisplayPage() {
  const params = useParams<{ displayId: string }>();
  const displayId = params.displayId;

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false); 
  const [contentError, setContentError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  

  const sendHeartbeat = useCallback(async () => {
    if (!displayId) return;
    try {
      console.log(`[Display ${displayId}] Sending heartbeat...`);
      await updateDeviceHeartbeatAction(displayId);
      console.log(`[Display ${displayId}] Heartbeat sent successfully.`);
    } catch (err) {
      console.error(`[Display ${displayId}] Error sending heartbeat:`, err);
    }
  }, [displayId]);

  useEffect(() => {
    if (!displayId) return; // Don't run effects if displayId is not yet available

    sendHeartbeat(); // Initial heartbeat on load
    const heartbeatInterval = setInterval(sendHeartbeat, 60 * 1000); // Send heartbeat every 60 seconds

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(); // Send heartbeat when tab becomes visible again
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Attempt to send a "going offline" signal (not guaranteed)
    const handleBeforeUnload = async () => {
        // This is best-effort. Most browsers will limit what can be done here.
        // A more robust solution involves a backend service detecting lack of heartbeats.
        console.log(`[Display ${displayId}] Attempting to signal offline on unload.`);
        // In a real scenario, you might try to update status to 'potentially_offline'
        // But direct reliable updates are hard here. The server will rely on lack of heartbeats.
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log(`[Display ${displayId}] Heartbeat interval cleared.`);
    };
  }, [displayId, sendHeartbeat]);


  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error(`Error attempting to enable full-screen mode: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      if (document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.error(`Error attempting to exit full-screen mode: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }, []);


  const fetchAndSetPlaylist = useCallback(async () => {
    if (!displayId) {
      setLoading(false); // Ensure loading stops if displayId isn't ready
      return;
    }
    setLoading(true);
    setError(null);
    setContentError(null); 
    console.log(`[Display ${displayId}] Initiating playlist fetch...`);
    try {
      const data = await getActivePlaylistForDisplay(displayId);
      if (data && data.items.length > 0) {
        setPlaylist(data);
        setCurrentItemIndex(0); 
        console.log(`[Display ${displayId}] Playlist "${data.name}" loaded with ${data.items.length} items.`);
      } else if (data && data.items.length === 0) {
        setError(`Active playlist "${data.name}" is empty. Please add content or check schedule.`);
        console.warn(`[Display ${displayId}] Active playlist "${data.name}" is empty.`);
      } else {
        const deviceExists = mockDevices.some(d => d.id === displayId);
        if (!deviceExists) {
          setError(`Display ID "${displayId}" not found. Cannot load playlist.`);
          console.error(`[Display ${displayId}] Display ID configuration not found.`);
        } else {
           setError("No active playlist found for this display. Check device schedule and fallback configuration.");
           console.warn(`[Display ${displayId}] No active playlist could be determined.`);
        }
      }
    } catch (e) {
      console.error(`[Display ${displayId}] Error fetching playlist data:`, e);
      setError("Failed to load playlist. Check network or configuration.");
    } finally {
      setLoading(false);
    }
  }, [displayId]);


  useEffect(() => {
    if (!displayId) return; // Don't run if displayId is not available
    fetchAndSetPlaylist();
    const scheduleCheckInterval = setInterval(fetchAndSetPlaylist, 60 * 1000 * 5); // Re-check playlist based on schedule every 5 mins
    console.log(`[Display ${displayId}] Display client initialized. Checking for active playlist based on schedule every 5m.`);
    return () => {
      clearInterval(scheduleCheckInterval);
      console.log(`[Display ${displayId}] Display client cleanup. Stopped schedule check interval.`);
    };
  }, [fetchAndSetPlaylist, displayId]);

  const advanceToNextItem = useCallback(() => {
    if (!playlist || playlist.items.length === 0) return;
    setCurrentItemIndex((prevIndex) => (prevIndex + 1) % playlist.items.length);
    setContentError(null); 
    console.log(`[Display ${displayId}] Advancing to next item. Index: ${(currentItemIndex + 1) % playlist.items.length}`);
  }, [playlist, currentItemIndex, displayId]);

  useEffect(() => {
    if (!playlist || playlist.items.length === 0 || isPaused || loading || error || contentError) return;

    const currentItem = playlist.items[currentItemIndex];
    const duration = (currentItem.duration || 10) * 1000;
    console.log(`[Display ${displayId}] Displaying item "${currentItem.title || currentItem.id}" for ${duration / 1000}s.`);

    const timer = setTimeout(() => {
      advanceToNextItem();
    }, duration);

    return () => {
      clearTimeout(timer);
      if (currentItem) { // Add a check for currentItem
        console.log(`[Display ${displayId}] Cleared timer for item "${currentItem.title || currentItem.id}".`);
      }
    };
  }, [currentItemIndex, playlist, isPaused, loading, error, contentError, advanceToNextItem, displayId]);

  const navigate = (direction: 'next' | 'prev') => {
    if (!playlist || playlist.items.length === 0) return;
    setIsPaused(true); 
    setContentError(null); 
    setCurrentItemIndex(prevIndex => {
      const newIndex = direction === 'next' 
        ? (prevIndex + 1) % playlist.items.length
        : (prevIndex - 1 + playlist.items.length) % playlist.items.length;
      console.log(`[Display ${displayId}] Manual navigation to item index: ${newIndex}. Paused for 5s.`);
      return newIndex;
    });
    setTimeout(() => setIsPaused(false), 5000); 
  };
  
  if (loading || !displayId) { // Also check if displayId is available before rendering main content
    return (
      <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-20 h-20 animate-spin text-accent mb-6" />
        <p className="mt-4 text-3xl font-headline tracking-wide">Loading Display Content for {displayId || '...'} </p>
        <p className="font-body text-slate-400 text-lg">Firefly Signage</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-red-900 flex flex-col items-center justify-center text-red-100 p-8 text-center">
        <AlertTriangle className="w-24 h-24 text-red-300 mb-6" />
        <p className="mt-4 text-4xl font-headline">{error}</p>
        <p className="font-body mt-3 text-lg text-red-200">Display ID: {displayId}. Please check the display configuration in the admin panel or contact support.</p>
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
        <p className="font-body text-slate-400 mt-2 text-lg">Display ID: {displayId}. No playlist is currently scheduled or the active playlist is empty.</p>
        <Button onClick={fetchAndSetPlaylist} variant="outline" className="mt-8 text-slate-300 border-slate-500 hover:bg-gray-700 hover:text-slate-100">
          Retry Loading
        </Button>
        <p className="font-body text-slate-500 text-sm mt-10">Firefly Signage</p>
      </div>
    );
  }

  const currentItem = playlist.items[currentItemIndex];
   if (!currentItem) { // Add a guard clause for currentItem
    return (
      <div className="fixed inset-0 bg-gray-700 flex flex-col items-center justify-center text-yellow-300 p-4 text-center">
        <Loader2 className="w-16 h-16 mb-4 animate-spin" />
        <p className="text-xl">Loading item data...</p>
      </div>
    );
  }

  const handleContentError = (item: ContentItem, type: string) => {
     const errorMessage = `Failed to load ${type} content: "${item.title || 'Untitled'}" from ${item.url}`;
     console.error(`[Display ${displayId}] ${errorMessage}`);
     setContentError(errorMessage);
  };

  const renderContentItem = (item: ContentItem) => {
    if (contentError && playlist.items[currentItemIndex]?.id === item.id) { 
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black text-yellow-400 p-4 text-center">
          <FileWarning className="w-16 h-16 mb-4" />
          <p className="text-xl font-semibold">Content Error</p>
          <p className="text-md max-w-xl break-words">{contentError}</p>
          <p className="text-sm mt-2">Will attempt next item in {item.duration || 10}s...</p>
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
            onError={() => handleContentError(item, 'image')}
          />
        ) : <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white"><FileWarning className="w-12 h-12 mr-2"/>Image URL missing for "{item.title || item.id}"</div>;
      case 'video':
        return item.url ? (
          <video
            key={item.id}
            src={item.url}
            autoPlay
            muted 
            loop 
            className="w-full h-full object-contain animate-fadeIn"
            onError={() => handleContentError(item, 'video')}
            onCanPlay={() => setContentError(null)} 
          />
        ) : <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white"><FileWarning className="w-12 h-12 mr-2"/>Video URL missing for "{item.title || item.id}"</div>;
      case 'web':
      case 'pdf': 
        return item.url ? (
          <iframe
            key={item.id}
            src={item.url}
            title={item.title || `Display Content ${currentItemIndex + 1}`}
            className="w-full h-full border-0 animate-fadeIn"
            sandbox="allow-scripts allow-same-origin allow-popups allow-downloads" 
            onError={() => handleContentError(item, item.type)}
            onLoad={() => setContentError(null)} 
          />
        ) : <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white"><FileWarning className="w-12 h-12 mr-2"/>{item.type.toUpperCase()} URL missing for "{item.title || item.id}"</div>;
      default:
         console.warn(`[Display ${displayId}] Unsupported content type: ${item.type} for item "${item.title || item.id}"`);
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700 text-yellow-300 p-4 text-center">
            <Tv2 className="w-16 h-16 mb-4" />
            <p className="text-xl">Unsupported content type: {(item as any).type}</p>
            <p>Item: "{item.title || item.id}"</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none group" role="main" aria-label={`Digital Signage Display ${displayId}`}>
      {renderContentItem(currentItem)}
      
      <button 
        onClick={() => navigate('prev')} 
        aria-label="Previous Item"
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/30 text-white/80 rounded-full hover:bg-black/50 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-70 opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <ArrowLeftCircle size={32} />
      </button>
      <button 
        onClick={() => navigate('next')}
        aria-label="Next Item"
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/30 text-white/80 rounded-full hover:bg-black/50 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-70 opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <ArrowRightCircle size={32} />
      </button>

      <button
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        className="absolute bottom-2 right-2 md:bottom-4 md:right-4 z-10 p-2 bg-black/30 text-white/80 rounded-full hover:bg-black/50 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-70 opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        {isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}
      </button>

      {currentItem.title && !(contentError && playlist.items[currentItemIndex]?.id === currentItem.id) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent text-white p-4 md:p-6 z-10 pointer-events-none">
          <p className="text-lg md:text-xl font-headline drop-shadow-md">{currentItem.title}</p>
        </div>
      )}
      
      <div className="absolute top-0 left-0 h-1 bg-accent/80 z-20" style={{ width: `${((currentItemIndex + 1) / playlist.items.length) * 100}%`, transition: 'width 0.3s ease-out' }}></div>
       <div className="absolute top-2 right-3 text-xs text-white/40 font-mono z-20 pointer-events-none">
        ID: {displayId}
      </div>
    </div>
  );
}

    