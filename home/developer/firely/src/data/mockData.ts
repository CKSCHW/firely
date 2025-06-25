
import type { Playlist, DisplayDevice, ContentItem, AvailableContent, ScheduleEntry } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { db, isFirebaseConfigured } from '@/lib/firebase'; 
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, writeBatch, query, updateDoc, deleteField } from 'firebase/firestore';

// Helper function to remove properties with undefined values
function removeUndefinedProps(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    // For arrays, map over items, remove undefined props from objects, and filter out any standalone undefined values
    return obj.map(item => (typeof item === 'object' && item !== null) ? removeUndefinedProps(item) : item)
               .filter(item => item !== undefined);
  }

  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) { 
      const value = obj[key];
      if (value !== undefined) {
        if (value instanceof Date) { // Keep Date objects as is
          newObj[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          newObj[key] = removeUndefinedProps(value); // Recurse for nested objects
        } else {
          newObj[key] = value;
        }
      }
      // If value is undefined, the key is simply not added to newObj
    }
  }
  return newObj;
}


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
  { id: 'content-10', type: 'pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', duration: 15, title: 'Sample PDF Document', dataAiHint: 'document info', pageImageUrls: [] },
];

const defaultPlaylistsData: Omit<Playlist, 'items'> & { itemIds: string[] }[] = [
  {
    id: 'playlist-1',
    name: 'Morning Loop',
    description: 'Content for morning display hours. Includes news and promotions.',
    itemIds: ['content-1', 'content-2', 'content-6', 'content-8'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'playlist-2',
    name: 'Evening Specials',
    description: 'Promotions and event highlights for the evening.',
    itemIds: ['content-3', 'content-4', 'content-5', 'content-7', 'content-10'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultPlaylists: Playlist[] = defaultPlaylistsData.map(p => ({
    ...p,
    items: p.itemIds.map(id => defaultContentItems.find(ci => ci.id === id)).filter(Boolean) as ContentItem[]
}));


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
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), 
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
    return;
  }

  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  const doLoad = async () => {
    if (!isFirebaseConfigured || !db) {
      console.warn("Firebase is not configured or not available. Using default in-memory data.");
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
            let dataToSet = item;
            if (collectionName === 'playlists' && (item as any).items) {
                dataToSet = { ...item, items: (item as any).items.map((subItem: any) => removeUndefinedProps({...subItem})) };
            } else if (collectionName === 'devices') {
                const deviceItem = item as unknown as DisplayDevice;
                const { currentPlaylistId, ...restOfDevice } = deviceItem;
                if (currentPlaylistId !== undefined) {
                    dataToSet = { ...restOfDevice, currentPlaylistId } as T;
                } else {
                    dataToSet = restOfDevice as T;
                }
            }
            batch.set(docRef, removeUndefinedProps(dataToSet));
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
      isDataLoaded = true; 
      reSyncAiAvailableContent();
      console.log('Initial data load from Firestore complete.');
    } catch (error) {
        console.error('Error during parallel data loading from Firestore:', error);
        availableContentItems.splice(0, availableContentItems.length, ...JSON.parse(JSON.stringify(defaultContentItems)));
        mockPlaylists.splice(0, mockPlaylists.length, ...JSON.parse(JSON.stringify(defaultPlaylists)));
        mockDevices.splice(0, mockDevices.length, ...JSON.parse(JSON.stringify(defaultDevices)));
        isDataLoaded = true; 
        reSyncAiAvailableContent(); 
    }
  };

  loadingPromise = doLoad();

  try {
    await loadingPromise;
  } catch (error) {
    console.error("Unhandled error during ensureDataLoaded execution:", error);
  } finally {
    loadingPromise = null;
  }
}

export async function addMockDevice(deviceId: string, name: string): Promise<{ success: true; device: DisplayDevice } | { success: false; message: string }> {
  await ensureDataLoaded();
  const currentTime = new Date().toISOString();

  const firestoreData = {
    id: deviceId, 
    name,
    status: 'online' as 'online' | 'offline',
    lastSeen: currentTime,
    schedule: [] as ScheduleEntry[],
  };

  if (isFirebaseConfigured && db) {
    const deviceDocRef = doc(db, 'devices', deviceId);
    try {
      const deviceDocSnap = await getDoc(deviceDocRef);
      if (deviceDocSnap.exists()) {
        return { success: false, message: `Device with ID "${deviceId}" already exists.` };
      }
      await setDoc(deviceDocRef, removeUndefinedProps(firestoreData));
    } catch (dbError) {
      console.error("Error adding device to Firestore (within addMockDevice): ", dbError);
      throw new Error(`Firestore operation failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }
  }

  const newDeviceInMemory: DisplayDevice = {
    id: deviceId,
    name,
    status: 'online',
    lastSeen: currentTime,
    schedule: [],
  };
  const existingInMemoryDeviceIndex = mockDevices.findIndex(d => d.id === deviceId);
  if (existingInMemoryDeviceIndex > -1) {
     mockDevices[existingInMemoryDeviceIndex] = newDeviceInMemory;
  } else {
    mockDevices.push(newDeviceInMemory);
  }
  return { success: true, device: newDeviceInMemory };
}


export async function updateMockDevice(deviceId: string, updates: Partial<Omit<DisplayDevice, 'id' | 'lastSeen' | 'status'>> & { schedule?: ScheduleEntry[] }): Promise<DisplayDevice | undefined> {
  await ensureDataLoaded();
  const deviceIndex = mockDevices.findIndex(d => d.id === deviceId);
  if (deviceIndex === -1) {
    console.error(`Device with id ${deviceId} not found for update.`);
    return undefined;
  }
  
   const updatedDeviceInMemory: DisplayDevice = {
    ...mockDevices[deviceIndex],
    name: updates.name !== undefined ? updates.name : mockDevices[deviceIndex].name,
    schedule: updates.schedule !== undefined ? updates.schedule : mockDevices[deviceIndex].schedule,
   };

   if ('currentPlaylistId' in updates) {
    if (updates.currentPlaylistId === undefined || updates.currentPlaylistId === null || updates.currentPlaylistId === "__NO_PLAYLIST__") {
      delete updatedDeviceInMemory.currentPlaylistId;
    } else {
      updatedDeviceInMemory.currentPlaylistId = updates.currentPlaylistId;
    }
   }


  if (isFirebaseConfigured && db) {
    try {
      const firestoreUpdates: any = { ...updates };
      delete firestoreUpdates.lastSeen;
      delete firestoreUpdates.status;

      if ('currentPlaylistId' in firestoreUpdates && (firestoreUpdates.currentPlaylistId === undefined || firestoreUpdates.currentPlaylistId === null || firestoreUpdates.currentPlaylistId === "__NO_PLAYLIST__")) {
        firestoreUpdates.currentPlaylistId = deleteField(); // Use deleteField to remove the field in Firestore
      }

      const cleanFirestoreUpdates = removeUndefinedProps(firestoreUpdates);
      if (Object.keys(cleanFirestoreUpdates).length > 0 || 'currentPlaylistId' in firestoreUpdates) { 
        await setDoc(doc(db, 'devices', deviceId), cleanFirestoreUpdates, { merge: true });
      }
    } catch (error) {
      console.error("Error updating device in Firestore: ", error);
      throw error;
    }
  }
  mockDevices[deviceIndex] = updatedDeviceInMemory; 
  return updatedDeviceInMemory;
}


export async function updateMockDeviceHeartbeat(deviceId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    console.warn(`[mockData] Heartbeat for ${deviceId} skipped; Firebase not configured.`);
    // For local dev without Firestore, we can try to update the in-memory array.
    // This is not a reliable solution for multi-instance servers but helps local testing.
    const deviceIndex = mockDevices.findIndex(d => d.id === deviceId);
    if (deviceIndex !== -1) {
        mockDevices[deviceIndex].lastSeen = new Date().toISOString();
        mockDevices[deviceIndex].status = 'online';
    }
    return;
  }

  // This is the main path for when Firestore is configured.
  try {
    const deviceRef = doc(db, 'devices', deviceId);
    // updateDoc will fail if the document doesn't exist, which is the desired behavior.
    await updateDoc(deviceRef, {
      lastSeen: new Date().toISOString(),
      status: 'online',
    });
  } catch (error) {
    console.error(`[mockData] Error updating heartbeat in Firestore for ${deviceId}:`, error);
    // Rethrow the error to be handled by the calling server action
    throw new Error(`Failed to update heartbeat for device ${deviceId}: ${error instanceof Error ? error.message : String(error)}`);
  }
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
    items: itemIds.map(id => availableContentItems.find(item => item.id === id)).filter(Boolean).map(ci => removeUndefinedProps({...ci})) as ContentItem[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'playlists', newPlaylist.id), removeUndefinedProps(newPlaylist));
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
    items: itemIds.map(itemId => availableContentItems.find(item => item.id === itemId)).filter(Boolean).map(ci => removeUndefinedProps({...ci})) as ContentItem[],
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'playlists', playlistId), removeUndefinedProps(updatedPlaylistData), { merge: true });
    } catch (error) {
      console.error("Error updating playlist in Firestore: ", error);
      throw error;
    }
  }
  mockPlaylists[playlistIndex] = updatedPlaylistData; 
  return updatedPlaylistData;
}

export async function deleteMockPlaylist(playlistId: string): Promise<boolean> {
  await ensureDataLoaded();
  const playlistIndex = mockPlaylists.findIndex(p => p.id === playlistId);
  if (playlistIndex === -1) {
    return false;
  }

  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      const playlistRef = doc(db, 'playlists', playlistId);
      batch.delete(playlistRef);

      const devicesQuery = query(collection(db, 'devices'));
      const devicesSnapshot = await getDocs(devicesQuery);
      
      devicesSnapshot.forEach(deviceDoc => {
        const deviceData = deviceDoc.data() as DisplayDevice;
        let needsUpdate = false;
        const updates: any = {};

        if (deviceData.currentPlaylistId === playlistId) {
          updates.currentPlaylistId = deleteField();
          needsUpdate = true;
        }
        
        if (deviceData.schedule && deviceData.schedule.length > 0) {
          const newSchedule = deviceData.schedule.filter(entry => entry.playlistId !== playlistId);
          if (newSchedule.length < deviceData.schedule.length) {
            updates.schedule = newSchedule;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          batch.update(deviceDoc.ref, updates);
        }
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Error deleting playlist or updating devices in Firestore: ", error);
      throw error;
    }
  }

  mockDevices.forEach(device => {
    if (device.currentPlaylistId === playlistId) {
      delete device.currentPlaylistId;
    }
    if (device.schedule) {
      device.schedule = device.schedule.filter(entry => entry.playlistId !== playlistId);
    }
  });

  mockPlaylists.splice(playlistIndex, 1);

  return true;
}


export async function addMockContentItem(itemData: Omit<ContentItem, 'id'>): Promise<ContentItem> {
  await ensureDataLoaded();
  const newItem: ContentItem = {
    id: `content-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...itemData,
  };
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'contentItems', newItem.id), removeUndefinedProps(newItem));
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
  const updatedItemData: ContentItem = { ...availableContentItems[itemIndex], ...itemData, id: contentId };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'contentItems', contentId), removeUndefinedProps(itemData), { merge: true }); 
      
      const playlistsSnapshot = await getDocs(collection(db, "playlists"));
      const batch = writeBatch(db);
      let wasAnyPlaylistModified = false;
      playlistsSnapshot.forEach(playlistDoc => {
        const playlist = playlistDoc.data() as Playlist;
        let playlistModifiedThisIteration = false;
        const updatedItems = playlist.items.map(item => {
          if (item.id === contentId) {
            playlistModifiedThisIteration = true;
            return removeUndefinedProps({...updatedItemData}); 
          }
          return removeUndefinedProps({...item});
        });
        if (playlistModifiedThisIteration) {
          wasAnyPlaylistModified = true;
          batch.update(doc(db, "playlists", playlist.id), { items: updatedItems, updatedAt: new Date().toISOString() });
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
        const updatedItems = playlist.items.filter(item => item.id !== contentId).map(item => removeUndefinedProps({...item}));
        if (updatedItems.length < originalItemCount) {
           wasAnyPlaylistModified = true;
           batch.update(doc(db, "playlists", playlist.id), { items: updatedItems, updatedAt: new Date().toISOString() });
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
