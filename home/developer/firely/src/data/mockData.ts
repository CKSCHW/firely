
import type { Playlist, DisplayDevice, ContentItem, ScheduleEntry } from '@/lib/types';
import { db, isFirebaseConfigured } from '@/lib/firebase'; 
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, writeBatch, query, updateDoc, deleteField } from 'firebase/firestore';

// Helper to clean objects for Firestore by removing undefined values
function cleanForFirestore(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanForFirestore(item));
  }
  if (obj instanceof Date) {
      return obj;
  }
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      newObj[key] = cleanForFirestore(obj[key]);
    }
  }
  return newObj;
}

// --- GET (Read) Functions ---

export async function getContentItems(): Promise<ContentItem[]> {
  if (!isFirebaseConfigured) return [];
  const q = query(collection(db, 'contentItems'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ContentItem[];
}

export async function getContentItem(id: string): Promise<ContentItem | null> {
  if (!isFirebaseConfigured) return null;
  const docRef = doc(db, 'contentItems', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? ({ ...docSnap.data(), id: docSnap.id } as ContentItem) : null;
}

export async function getPlaylists(): Promise<Playlist[]> {
  if (!isFirebaseConfigured) return [];
  const q = query(collection(db, 'playlists'));
  const snapshot = await getDocs(q);
  const playlistsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Playlist & { itemIds: string[] }));

  // Populate items for each playlist
  const allContentItems = await getContentItems();
  const contentMap = new Map(allContentItems.map(item => [item.id, item]));

  return playlistsData.map(playlist => ({
    ...playlist,
    items: (playlist.itemIds || []).map(id => contentMap.get(id)).filter(Boolean) as ContentItem[]
  }));
}

export async function getPlaylist(id: string): Promise<Playlist | null> {
  if (!isFirebaseConfigured) return null;
  const docRef = doc(db, 'playlists', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  
  const playlistData = { ...docSnap.data(), id: docSnap.id } as Playlist & { itemIds: string[] };

  const allContentItems = await getContentItems();
  const contentMap = new Map(allContentItems.map(item => [item.id, item]));
  
  playlistData.items = (playlistData.itemIds || []).map(itemId => contentMap.get(itemId)).filter(Boolean) as ContentItem[];
  
  return playlistData;
}


export async function getDevices(): Promise<DisplayDevice[]> {
  if (!isFirebaseConfigured) return [];
  const q = query(collection(db, 'devices'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as DisplayDevice[];
}

export async function getDevice(id: string): Promise<DisplayDevice | null> {
  if (!isFirebaseConfigured) return null;
  const docRef = doc(db, 'devices', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? ({ ...docSnap.data(), id: docSnap.id } as DisplayDevice) : null;
}

// --- ADD (Create) Functions ---

export async function addContentItem(itemData: Omit<ContentItem, 'id'>): Promise<ContentItem> {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  const docRef = doc(collection(db, 'contentItems'));
  const newItem: Omit<ContentItem, 'id'> = { ...itemData };
  await setDoc(docRef, cleanForFirestore(newItem));
  return { ...newItem, id: docRef.id };
}

export async function addPlaylist(name: string, description: string | undefined, itemIds: string[]): Promise<Playlist> {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");

  const newPlaylistData = {
    name,
    description,
    itemIds: itemIds, // Store array of IDs, not full objects
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docRef = doc(collection(db, 'playlists'));
  await setDoc(docRef, cleanForFirestore(newPlaylistData));
  
  // For the return value, we conform to the type, but the stored data is just IDs.
  const items = await Promise.all(itemIds.map(id => getContentItem(id)));
  return { ...newPlaylistData, id: docRef.id, items: items.filter(Boolean) as ContentItem[] };
}

export async function addDevice(deviceId: string, name: string): Promise<{ success: true; device: DisplayDevice } | { success: false; message: string }> {
  if (!isFirebaseConfigured) return { success: false, message: "Firebase not configured." };
  const docRef = doc(db, 'devices', deviceId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { success: false, message: `Device with ID "${deviceId}" already exists.` };
  }
  const newDevice: Omit<DisplayDevice, 'id'> = {
    name,
    status: 'offline',
    lastSeen: new Date(0).toISOString(),
    schedule: [],
  };
  await setDoc(docRef, cleanForFirestore(newDevice));
  return { success: true, device: { ...newDevice, id: deviceId } };
}

// --- UPDATE Functions ---

export async function updateContentItem(contentId: string, itemData: Partial<Omit<ContentItem, 'id'>>): Promise<ContentItem | undefined> {
    if (!isFirebaseConfigured) throw new Error("Firebase not configured");
    const itemRef = doc(db, 'contentItems', contentId);
    await updateDoc(itemRef, cleanForFirestore(itemData));
    
    // When a playlist is loaded, it fetches the latest content item data.
    // However, if we want to ensure data consistency across the app after an update,
    // we might need to trigger re-fetches on playlist pages. `revalidatePath` handles this.
    
    return getContentItem(contentId);
}

export async function updatePlaylist(playlistId: string, name: string, description: string | undefined, itemIds: string[]): Promise<Playlist | undefined> {
    if (!isFirebaseConfigured) throw new Error("Firebase not configured");
    const playlistData = {
        name,
        description,
        itemIds: itemIds, // Store array of IDs
        updatedAt: new Date().toISOString(),
    };
    const playlistRef = doc(db, 'playlists', playlistId);
    await updateDoc(playlistRef, cleanForFirestore(playlistData));
    return getPlaylist(playlistId);
}

export async function updateDevice(deviceId: string, updates: Partial<Omit<DisplayDevice, 'id'>>): Promise<DisplayDevice | undefined> {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  const deviceRef = doc(db, 'devices', deviceId);
  const cleanUpdates = cleanForFirestore(updates);
  if ('currentPlaylistId' in updates && updates.currentPlaylistId === '__NO_PLAYLIST__') {
      cleanUpdates.currentPlaylistId = deleteField();
  }
  await updateDoc(deviceRef, cleanUpdates);
  return getDevice(deviceId);
}

export async function updateDeviceHeartbeat(deviceId: string): Promise<void> {
    if (!isFirebaseConfigured) return;
    const deviceRef = doc(db, 'devices', deviceId);
    await updateDoc(deviceRef, {
        lastSeen: new Date().toISOString(),
        status: 'online',
    }).catch(err => {
      console.error(`Failed to update heartbeat for ${deviceId}`, err);
      // Don't throw, allow graceful failure
    });
}

// --- DELETE Functions ---

export async function deleteContentItem(contentId: string): Promise<boolean> {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  const contentRef = doc(db, 'contentItems', contentId);
  await deleteDoc(contentRef);
  
  // Remove item ID from all playlists
  const q = query(collection(db, 'playlists'));
  const playlistsSnapshot = await getDocs(q);
  const batch = writeBatch(db);
  playlistsSnapshot.forEach(playlistDoc => {
      const playlist = playlistDoc.data() as { itemIds?: string[] };
      if (playlist.itemIds && playlist.itemIds.includes(contentId)) {
        const updatedItemIds = playlist.itemIds.filter(id => id !== contentId);
        batch.update(doc(db, "playlists", playlistDoc.id), { itemIds: updatedItemIds, updatedAt: new Date().toISOString() });
      }
  });
  await batch.commit();
  return true;
}

export async function deletePlaylist(playlistId: string): Promise<boolean> {
    if (!isFirebaseConfigured) throw new Error("Firebase not configured");
    const playlistRef = doc(db, 'playlists', playlistId);
    await deleteDoc(playlistRef);

    // Remove this playlist from all device schedules and fallbacks
    const q = query(collection(db, 'devices'));
    const devicesSnapshot = await getDocs(q);
    const batch = writeBatch(db);
    devicesSnapshot.forEach(deviceDoc => {
        const deviceData = deviceDoc.data() as DisplayDevice;
        const updates: any = {};
        let needsUpdate = false;
        if(deviceData.currentPlaylistId === playlistId) {
            updates.currentPlaylistId = deleteField();
            needsUpdate = true;
        }
        if(deviceData.schedule) {
            const newSchedule = deviceData.schedule.filter(entry => entry.playlistId !== playlistId);
            if(newSchedule.length < deviceData.schedule.length) {
                updates.schedule = newSchedule;
                needsUpdate = true;
            }
        }
        if(needsUpdate) {
            batch.update(deviceDoc.ref, updates);
        }
    });
    await batch.commit();
    return true;
}

export async function deleteDevice(deviceId: string): Promise<boolean> {
  if (!isFirebaseConfigured) throw new Error("Firebase not configured");
  await deleteDoc(doc(db, 'devices', deviceId));
  return true;
}
