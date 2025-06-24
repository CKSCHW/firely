
"use client";

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import type { Playlist, ContentItem, DisplayDevice } from '@/lib/types';
import { mockPlaylists, mockDevices, availableContentItems, ensureDataLoaded } from '@/data/mockData';
import { ArrowLeftCircle, ArrowRightCircle, Loader2, AlertTriangle, EyeOff, Tv2, FileWarning, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateDeviceHeartbeatAction } from '@/app/admin/devices/actions';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('@/components/display/PdfViewer'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-700 p-4 text-center"><Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" /><p>Loading PDF Viewer...</p></div>,
});


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
  const paramsHook = useParams<{ displayId: string }>();
  const displayId = paramsHook?.displayId; // Use optional chaining

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
    if (!displayId) return; 

    sendHeartbeat(); 
    const heartbeatInterval = setInterval(sendHeartbeat, 60 * 1000); 

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(); 
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleBeforeUnload = async () => {
        console.log(`[Display ${displayId}] Attempting to signal offline on unload.`);
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
    // Check if running in a browser environment before accessing document
    if (typeof document !== 'undefined') {
      setIsFullscreen(!!document.fullscreenElement); // Initial check
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }
  }, [handleFullscreenChange]);

  const toggleFullscreen = useCallback(async () => {
     if (typeof document === 'undefined') return;

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
      setLoading(false); 
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
        setError(`Aktive Playlist "${data.name}" ist leer. Bitte Inhalt hinzufügen oder Zeitplan prüfen.`);
        console.warn(`[Display ${displayId}] Active playlist "${data.name}" is empty.`);
      } else {
        const deviceExists = mockDevices.some(d => d.id === displayId);
        if (!deviceExists) {
          setError(`Display ID "${displayId}" nicht gefunden. Playlist kann nicht geladen werden.`);
          console.error(`[Display ${displayId}] Display ID configuration not found.`);
        } else {
           setError("Keine aktive Playlist für dieses Display gefunden. Gerätezeitplan und Standardkonfiguration prüfen.");
           console.warn(`[Display ${displayId}] No active playlist could be determined.`);
        }
      }
    } catch (e) {
      console.error(`[Display ${displayId}] Error fetching playlist data:`, e);
      setError("Fehler beim Laden der Playlist. Netzwerk oder Konfiguration prüfen.");
    } finally {
      setLoading(false);
    }
  }, [displayId]);


  useEffect(() => {
    if (!displayId) return; 
    fetchAndSetPlaylist();
    const scheduleCheckInterval = setInterval(fetchAndSetPlaylist, 60 * 1000 * 5); 
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
    if (!currentItem) {
      console.log("[Display] No current item found, skipping timer.");
      return;
    }
    
    const duration = (currentItem.duration || 10) * 1000;
    console.log(`[Display ${displayId}] Displaying item "${currentItem.title || currentItem.id}" for ${duration / 1000}s.`);

    const timer = setTimeout(() => {
      advanceToNextItem();
    }, duration);

    return () => {
      clearTimeout(timer);
       if (currentItem) { 
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
  
  if (loading || !displayId) { 
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center text-slate-800">
        <Loader2 className="w-20 h-20 animate-spin text-accent mb-6" />
        <p className="mt-4 text-3xl font-headline tracking-wide">Lade Display Inhalte für {displayId || '...'} </p>
        <p className="font-body text-slate-600 text-lg">Schwarzmann Screen</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-red-100 flex flex-col items-center justify-center text-red-900 p-8 text-center">
        <AlertTriangle className="w-24 h-24 text-red-400 mb-6" />
        <p className="mt-4 text-4xl font-headline">{error}</p>
        <p className="font-body mt-3 text-lg text-red-700">Display ID: {displayId}. Bitte prüfen Sie die Display-Konfiguration im Admin-Panel oder kontaktieren Sie den Support.</p>
        <Button onClick={fetchAndSetPlaylist} variant="outline" className="mt-8 text-red-800 border-red-400 hover:bg-red-200 hover:text-red-900">
          Erneut laden
        </Button>
        <p className="font-body text-red-500 text-sm mt-12">Schwarzmann Screen Fehler</p>
      </div>
    );
  }
  
  if (!playlist || playlist.items.length === 0) {
     return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center text-slate-700 p-8 text-center">
        <EyeOff className="w-24 h-24 text-slate-400 mb-6" />
        <p className="mt-4 text-3xl font-headline">Kein Inhalt zum Anzeigen</p>
        <p className="font-body text-slate-500 mt-2 text-lg">Display ID: {displayId}. Keine Playlist aktuell geplant oder die aktive Playlist ist leer.</p>
        <Button onClick={fetchAndSetPlaylist} variant="outline" className="mt-8 text-slate-600 border-slate-400 hover:bg-gray-100 hover:text-slate-800">
          Erneut laden
        </Button>
        <p className="font-body text-slate-400 text-sm mt-10">Schwarzmann Screen</p>
      </div>
    );
  }

  const currentItem = playlist.items[currentItemIndex];
   if (!currentItem) { 
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center text-yellow-800 p-4 text-center">
        <Loader2 className="w-16 h-16 mb-4 animate-spin text-yellow-500" />
        <p className="text-xl">Lade Inhaltsdaten...</p>
      </div>
    );
  }

  const handleContentError = (item: ContentItem, type: string) => {
     const errorMessage = `Fehler beim Laden von ${type}-Inhalt: "${item.title || 'Ohne Titel'}" von ${item.url}`;
     console.error(`[Display ${displayId}] ${errorMessage}`);
     setContentError(errorMessage);
  };

  const renderContentItem = (item: ContentItem) => {
    if (contentError && playlist.items[currentItemIndex]?.id === item.id) { 
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 text-red-600 p-4 text-center">
          <FileWarning className="w-16 h-16 mb-4" />
          <p className="text-xl font-semibold">Inhaltsfehler</p>
          <p className="text-md max-w-xl break-words">{contentError}</p>
          <p className="text-sm mt-2">Versuche nächstes Element in {item.duration || 10}s...</p>
        </div>
      );
    }

    switch (item.type) {
      case 'image':
        return item.url ? (
          <Image
            key={item.id}
            src={item.url}
            alt={item.title || `Display Inhalt ${currentItemIndex + 1}`}
            fill={true}
            style={{ objectFit: "contain" }}
            quality={90}
            priority 
            className="animate-fadeIn"
            data-ai-hint={item.dataAiHint || "signage image"}
            unoptimized={item.url.startsWith("https://placehold.co") || item.url.startsWith('blob:') || item.url.startsWith('/uploads/')}
            onError={() => handleContentError(item, 'image')}
          />
        ) : <div className="w-full h-full flex items-center justify-center bg-gray-200 text-red-600"><FileWarning className="w-12 h-12 mr-2"/>Bild-URL fehlt für "{item.title || item.id}"</div>;
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
        ) : <div className="w-full h-full flex items-center justify-center bg-gray-200 text-red-600"><FileWarning className="w-12 h-12 mr-2"/>Video-URL fehlt für "{item.title || item.id}"</div>;
      case 'pdf':
         return item.url ? (
           <PdfViewer url={item.url} duration={item.duration} onError={() => handleContentError(item, 'pdf')} />
        ) : <div className="w-full h-full flex items-center justify-center bg-gray-200 text-red-600"><FileWarning className="w-12 h-12 mr-2"/>PDF URL fehlt für "{item.title || item.id}"</div>;
      case 'web': 
        return item.url ? (
          <iframe
            key={item.id}
            src={item.url}
            title={item.title || `Display Inhalt ${currentItemIndex + 1}`}
            className="w-full h-full border-0 animate-fadeIn"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-presentation allow-downloads" 
            onError={() => handleContentError(item, item.type)}
            onLoad={() => setContentError(null)} 
          />
        ) : <div className="w-full h-full flex items-center justify-center bg-gray-200 text-red-600"><FileWarning className="w-12 h-12 mr-2"/>Web-URL fehlt für "{item.title || item.id}"</div>;
      default:
         console.warn(`[Display ${displayId}] Unsupported content type: ${item.type} for item "${item.title || item.id}"`);
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 text-yellow-800 p-4 text-center">
            <Tv2 className="w-16 h-16 mb-4" />
            <p className="text-xl">Nicht unterstützter Inhaltstyp: {(item as any).type}</p>
            <p>Element: "{item.title || item.id}"</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center overflow-hidden select-none group" role="main" aria-label={`Digital Signage Display ${displayId}`}>
      {renderContentItem(currentItem)}
      
      <button 
        onClick={() => navigate('prev')} 
        aria-label="Vorheriges Element"
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/20 text-white rounded-full hover:bg-black/30 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-70 opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <ArrowLeftCircle size={32} />
      </button>
      <button 
        onClick={() => navigate('next')}
        aria-label="Nächstes Element"
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/20 text-white rounded-full hover:bg-black/30 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-70 opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <ArrowRightCircle size={32} />
      </button>

      <button
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Vollbild Beenden" : "Vollbild Starten"}
        className="absolute bottom-2 right-2 md:bottom-4 md:right-4 z-10 p-2 bg-black/20 text-white rounded-full hover:bg-black/30 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-70 opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        {isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}
      </button>

      {currentItem.title && !(contentError && playlist.items[currentItemIndex]?.id === currentItem.id) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent text-white p-4 md:p-6 z-10 pointer-events-none">
          <p className="text-lg md:text-xl font-headline drop-shadow-md">{currentItem.title}</p>
        </div>
      )}
      
      <div className="absolute top-0 left-0 h-1 bg-accent/80 z-20" style={{ width: `${((currentItemIndex + 1) / playlist.items.length) * 100}%`, transition: 'width 0.3s ease-out' }}></div>
       <div className="absolute top-2 right-3 text-xs text-black/40 font-mono z-20 pointer-events-none">
        ID: {displayId}
      </div>
    </div>
  );
}
