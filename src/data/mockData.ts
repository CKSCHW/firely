
import type { Playlist, DisplayDevice, ContentItem, AvailableContent, ScheduleEntry } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { db, isFirebaseConfigured } from '@/lib/firebase'; // Import Firestore instance
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch, query, getDoc } from 'firebase/firestore';

// Default data (used to seed Firestore if empty, or as fallback if Firebase isn't configured)
const defaultContentItems: ContentItem[] = [
  { id: 'content-1', type: 'image', url: 'https://placehold.co/1920x1080/FF9800/3F51B5?text=Orange+Promo', duration: 7, title: 'Special Orange Promotion', dataAiHint: 'promotion sale' },
  { id: 'content-2', type: 'image', url: 'https://placehold.co/1920x1080/3F51B5/FFFFFF?text=Company+News+Update', duration: 10, title: 'Latest Company News', dataAiHint: 'corporate announcement' },
  { id: 'content-3', type: 'image', url: 'https://placehold.co/1920x1080/4CAF50/FFFFFF?text=New+Green+Product', duration: 12, title: 'Introducing Green Product', dataAiHint: 'product feature' },
  { id: 'content-4', type: 'image', url: 'https://placehold.co/1920x1080/F44336/FFFFFF?text=Important+Red+Alert', duration: 5, title: 'Critical Red Alert', dataAiHint: 'important warning' },
  { id: 'content-5', type: 'image', url: 'https://placehold.co/1920x1080/9C27B0/FFFFFF?text=Upcoming+Purple+Event', duration: 8, title: 'Don\'t Miss Purple Event', dataAiHint: 'upcoming event' },
  { id: 'content-6', type: 'image', url: 'https://placehold.co/1920x1080/00BCD4/FFFFFF?text=Cyan+Services+Info', duration: 10, title: 'Our Cyan Services', dataAiHint: 'service information' },
  { id: 'content-7', type: 'image', url: 'https://placehold.co/1920x1080/FFEB3B/000000?text=Yellow+Highlights', duration: 9, title: 'Yellow Highlights of the Week', dataAiHint: 'weekly summary' },
  { id: 'content-8', type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', duration: 30, title: 'Big Buck Bunny Promo', dataAiHint: 'animated video' },
  { id: 'content-9', type: 'web', url: 'https://example.com', duration: 20, title: 'Example Company Website', dataAiHint: 'web page' },
  { id: 'content-10', type: 'pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', duration: 15, title: 'Sample PDF Document', dataAiHint: 'document info' },
];

const defaultPlaylists: Playlist[] = [
  {
    id: 'playlist-1',
    name: 'Morning Loop',
    description: 'Content for morning display hours. Includes news and promotions.',
    items: [defaultContentItems[0], defaultContentItems[1], defaultContentItems[5], defaultContentItems[7]].filter(Boolean).map(ci => defaultContentItems.find(item => item.id === ci.id) as ContentItem),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'playlist-2',
    name: 'Evening Specials',
    description: 'Promotions and event highlights for the evening.',
    items: [defaultContentItems[2], defaultContentItems[3], defaultContentItems[4], defaultContentItems[6], defaultContentItems[9]].filter(Boolean).map(ci => defaultContentItems.find(item => item.id === ci.id) as ContentItem),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultDevices: DisplayDevice[] = [
  {
    id: 'display-101',
    name: 'Lobby Screen 1 (Main Entrance)',
    status: 'online',
    lastSeen: new Date().toISOString(),
    currentPlaylistId: 'playlist-1',
    schedule: [
      { id: uuidv4(), playlistId: 'playlist-2', startTime: '09:00', endTime: '17:00', daysOfWeek: [1,2,3,4,5] }
    ]
  },
  {
    id: 'display-102',
    name: 'Cafeteria Screen (East Wall)',
    status: 'offline',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    currentPlaylistId: 'playlist-2',
    schedule: []
  },
   {
    id: 'sample-display-1',
    name: 'Sample Demo Display',
    status: 'online',
    lastSeen: new Date().toISOString(),
    currentPlaylistId: 'playlist-1',
    schedule: [
      { id: uuidv4(), playlistId: 'playlist-2', startTime: '08:00', endTime: '12:00', daysOfWeek: [1,2,3,4,5] },
      { id: uuidv4(), playlistId: 'playlist-1', startTime: '12:01', endTime: '18:00', daysOfWeek: [1,2,3,4,5] }
    ]
  }
];

// In-memory caches
export let availableContentItems: ContentItem[] = [];
export let mockPlaylists: Playlist[] = [];
export let mockDevices: DisplayDevice[] = [];
export let aiAvailableContent: AvailableContent[] = [];

let isDataLoaded = false;
let loadingPromise: Promise<void> | null = null;

function reSyncAiAvailableContent() {
  aiAvailableContent = availableContentItems.map(item => ({
    id: item.id,
    name: item.title || item.id,
  }));
}

export async function ensureDataLoaded() {
  if (isDataLoaded) {
    console.log('Data already loaded, skipping Firestore fetch.');
    return;
  }

  if (loadingPromise) {
    console.log('Data loading already in progress, awaiting existing promise.');
    await loadingPromise;
    return;
  }

  const doLoad = async () => {
    if (!isFirebaseConfigured || !db) {
      console.warn("Firebase is not configured or not available. Using default in-memory data. Please set up Firebase environment variables.");
      availableContentItems.splice(0, availableContentItems.length, ...JSON.parse(JSON.stringify(defaultContentItems)));
      mockPlaylists.splice(0, mockPlaylists.length, ...JSON.parse(JSON.stringify(defaultPlaylists)));
      mockDevices.splice(0, mockDevices.length, ...JSON.parse(JSON.stringify(defaultDevices)));
      isDataLoaded = true;
      reSyncAiAvailableContent();
      return;
    }

    const loadCollection = async <T extends { id: string }>(collectionName: string, defaultData: T[], inMemoryArray: T[]): Promise<void> => {
      try {
        const q = query(collection(db, collectionName));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty && defaultData.length > 0) {
          console.log(`Firestore collection '${collectionName}' is empty. Initializing with default data...`);
          const batch = writeBatch(db);
          JSON.parse(JSON.stringify(defaultData)).forEach((item: T) => {
            const docRef = doc(db, collectionName, item.id);
            batch.set(docRef, item);
          });
          await batch.commit();
          inMemoryArray.splice(0, inMemoryArray.length, ...JSON.parse(JSON.stringify(defaultData)));
          console.log(`Firestore collection '${collectionName}' initialized and in-memory array populated.`);
        } else {
          const dataFromDb: T[] = [];
          querySnapshot.forEach((docSnapshot) => {
            dataFromDb.push({ ...docSnapshot.data(), id: docSnapshot.id } as T);
          });
          inMemoryArray.splice(0, inMemoryArray.length, ...dataFromDb);
          console.log(`Loaded ${dataFromDb.length} items from Firestore collection '${collectionName}' into in-memory array.`);
        }
      } catch (error) {
        console.error(`Error loading or initializing collection ${collectionName} from Firestore:`, error);
        console.warn(`Falling back to default data for collection '${collectionName}'.`);
        inMemoryArray.splice(0, inMemoryArray.length, ...JSON.parse(JSON.stringify(defaultData)));
      }
    };

    console.log('Initial data load from Firestore starting...');
    try {
      await Promise.all([
        loadCollection<ContentItem>('contentItems', defaultContentItems, availableContentItems),
        loadCollection<Playlist>('playlists', defaultPlaylists, mockPlaylists),
        loadCollection<DisplayDevice>('devices', defaultDevices, mockDevices),
      ]);
      isDataLoaded = true; // Set this only after all collections are attempted
      reSyncAiAvailableContent();
      console.log('Initial data load from Firestore complete.');
    } catch (error) {
        console.error('Error during parallel data loading from Firestore:', error);
        // If Promise.all fails, isDataLoaded might not be true, potentially allowing retry.
        // Or, consider setting isDataLoaded = true anyway to prevent retries if fallback data is used for all.
        // For now, let's assume if any fails, it's caught by individual loadCollection errors.
        // If not, isDataLoaded would remain false, leading to retries on next call.
        // To be safe, let's set isDataLoaded true here too, since fallbacks are in place.
        isDataLoaded = true; 
        reSyncAiAvailableContent(); // Ensure this runs even on error if fallback data is used.
    }
  };

  loadingPromise = doLoad();

  try {
    await loadingPromise;
  } catch (error) {
    // This catch is mostly for unexpected errors within doLoad not caught by inner try-catches
    console.error("Unhandled error during ensureDataLoaded execution:", error);
  } finally {
    loadingPromise = null;
  }
}

// --- Mutator Functions ---

export async function addMockDevice(name: string): Promise<DisplayDevice> {
  await ensureDataLoaded();
  const newDevice: DisplayDevice = {
    id: `display-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    status: 'online', 
    lastSeen: new Date().toISOString(),
    currentPlaylistId: undefined, 
    schedule: [],
  };
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'devices', newDevice.id), newDevice);
    } catch (error) {
      console.error("Error adding device to Firestore: ", error);
      throw error;
    }
  }
  mockDevices.push(newDevice); 
  return newDevice;
}

export async function updateMockDevice(deviceId: string, updates: Partial<Omit<DisplayDevice, 'id' | 'lastSeen' | 'status'>> & { schedule?: ScheduleEntry[] }): Promise<DisplayDevice | undefined> {
  await ensureDataLoaded();
  const deviceIndex = mockDevices.findIndex(d => d.id === deviceId);
  if (deviceIndex === -1) {
    console.error(`Device with id ${deviceId} not found for update.`);
    return undefined;
  }
  
  const updatedDeviceData = {
    ...mockDevices[deviceIndex],
    name: updates.name ?? mockDevices[deviceIndex].name,
    currentPlaylistId: updates.currentPlaylistId, 
    schedule: updates.schedule ?? mockDevices[deviceIndex].schedule, 
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'devices', deviceId), updatedDeviceData, { merge: true });
    } catch (error) {
      console.error("Error updating device in Firestore: ", error);
      throw error;
    }
  }
  mockDevices[deviceIndex] = updatedDeviceData; 
  return updatedDeviceData;
}

export async function deleteMockDevice(deviceId: string): Promise<boolean> {
  await ensureDataLoaded();
  const initialLength = mockDevices.length;
  
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'devices', deviceId));
    } catch (error) {
      console.error("Error deleting device from Firestore: ", error);
      throw error;
    }
  }
  mockDevices = mockDevices.filter(d => d.id !== deviceId); 
  return mockDevices.length < initialLength;
}


export async function addMockPlaylist(name: string, description: string | undefined, itemIds: string[]): Promise<Playlist> {
  await ensureDataLoaded();
  const newPlaylist: Playlist = {
    id: `playlist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    description,
    items: itemIds.map(id => availableContentItems.find(item => item.id === id)).filter(Boolean) as ContentItem[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (isFirebaseConfigured && db) {
    try {
      const firestorePlaylist = { ...newPlaylist, items: newPlaylist.items.map(item => ({...item})) };
      await setDoc(doc(db, 'playlists', newPlaylist.id), firestorePlaylist);
    } catch (error) {
      console.error("Error adding playlist to Firestore: ", error);
      throw error;
    }
  }
  mockPlaylists.push(newPlaylist); 
  return newPlaylist;
}

export async function updateMockPlaylist(playlistId: string, name: string, description: string | undefined, itemIds: string[]): Promise<Playlist | undefined> {
  await ensureDataLoaded();
  const playlistIndex = mockPlaylists.findIndex(p => p.id === playlistId);
  if (playlistIndex === -1) {
    return undefined;
  }
  const updatedPlaylistData: Playlist = {
    ...mockPlaylists[playlistIndex],
    name,
    description,
    items: itemIds.map(itemId => availableContentItems.find(item => item.id === itemId)).filter(Boolean) as ContentItem[],
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    try {
      const firestorePlaylist = { ...updatedPlaylistData, items: updatedPlaylistData.items.map(item => ({...item})) };
      await setDoc(doc(db, 'playlists', playlistId), firestorePlaylist, { merge: true });
    } catch (error) {
      console.error("Error updating playlist in Firestore: ", error);
      throw error;
    }
  }
  mockPlaylists[playlistIndex] = updatedPlaylistData; 
  return updatedPlaylistData;
}

export async function addMockContentItem(itemData: Omit<ContentItem, 'id'>): Promise<ContentItem> {
  await ensureDataLoaded();
  const newItem: ContentItem = {
    id: `content-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...itemData,
  };
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'contentItems', newItem.id), newItem);
    } catch (error) {
      console.error("Error adding content item to Firestore: ", error);
      throw error;
    }
  }
  availableContentItems.push(newItem); 
  reSyncAiAvailableContent();
  return newItem;
}

export async function updateMockContentItem(contentId: string, itemData: Partial<Omit<ContentItem, 'id'>>): Promise<ContentItem | undefined> {
  await ensureDataLoaded();
  const itemIndex = availableContentItems.findIndex(item => item.id === contentId);
  if (itemIndex === -1) {
    return undefined;
  }
  const updatedItemData = { ...availableContentItems[itemIndex], ...itemData, id: contentId };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'contentItems', contentId), updatedItemData, { merge: true });
      
      const playlistsSnapshot = await getDocs(collection(db, "playlists"));
      const batch = writeBatch(db);
      let wasAnyPlaylistModified = false;
      playlistsSnapshot.forEach(playlistDoc => {
        const playlist = playlistDoc.data() as Playlist;
        let playlistModifiedThisIteration = false;
        const updatedItems = playlist.items.map(item => {
          if (item.id === contentId) {
            playlistModifiedThisIteration = true;
            return updatedItemData;
          }
          return item;
        });
        if (playlistModifiedThisIteration) {
          wasAnyPlaylistModified = true;
          batch.update(doc(db, "playlists", playlist.id), { items: updatedItems.map(item => ({...item})), updatedAt: new Date().toISOString() });
        }
      });
      if (wasAnyPlaylistModified) {
        await batch.commit();
      }

    } catch (error) {
      console.error("Error updating content item or playlists in Firestore: ", error);
      throw error;
    }
  }
  availableContentItems[itemIndex] = updatedItemData; 
  mockPlaylists = mockPlaylists.map(playlist => ({ 
    ...playlist,
    items: playlist.items.map(item => item.id === contentId ? updatedItemData : item),
    updatedAt: playlist.items.some(item => item.id === contentId) ? new Date().toISOString() : playlist.updatedAt,
  }));
  reSyncAiAvailableContent();
  return updatedItemData;
}

export async function deleteMockContentItem(contentId: string): Promise<boolean> {
  await ensureDataLoaded();
  const itemIndex = availableContentItems.findIndex(item => item.id === contentId);
  if (itemIndex === -1) {
    return false;
  }

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'contentItems', contentId));
      
      const playlistsSnapshot = await getDocs(collection(db, "playlists"));
      const batch = writeBatch(db);
      let wasAnyPlaylistModified = false;
      playlistsSnapshot.forEach(playlistDoc => {
        const playlist = playlistDoc.data() as Playlist;
        const originalItemCount = playlist.items.length;
        const updatedItems = playlist.items.filter(item => item.id !== contentId);
        if (updatedItems.length < originalItemCount) {
           wasAnyPlaylistModified = true;
           batch.update(doc(db, "playlists", playlist.id), { items: updatedItems.map(item => ({...item})), updatedAt: new Date().toISOString() });
        }
      });
      if (wasAnyPlaylistModified) {
        await batch.commit();
      }
    } catch (error) {
      console.error("Error deleting content item or updating playlists in Firestore: ", error);
      throw error;
    }
  }
  availableContentItems.splice(itemIndex, 1); 
  mockPlaylists = mockPlaylists.map(playlist => ({ 
    ...playlist,
    items: playlist.items.filter(item => item.id !== contentId),
     updatedAt: playlist.items.some(item => item.id === contentId) ? new Date().toISOString() : playlist.updatedAt,
  }));
  reSyncAiAvailableContent();
  return true;
}
