
import type { Playlist, DisplayDevice, ContentItem, AvailableContent } from '@/lib/types';

// Initial default data (used if JSON files don't exist or are empty, or on client-side if FS ops are skipped)
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
  },
  {
    id: 'display-102',
    name: 'Cafeteria Screen (East Wall)',
    status: 'offline',
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    currentPlaylistId: 'playlist-2',
  },
   {
    id: 'sample-display-1',
    name: 'Sample Demo Display',
    status: 'online',
    lastSeen: new Date().toISOString(),
    currentPlaylistId: 'playlist-1'
  }
];

const contentItemsJsonFile = 'contentItems.json';
const playlistsJsonFile = 'playlists.json';
const devicesJsonFile = 'devices.json';

export let availableContentItems: ContentItem[] = [...defaultContentItems];
export let mockPlaylists: Playlist[] = [...defaultPlaylists];
export let mockDevices: DisplayDevice[] = [...defaultDevices];
export let aiAvailableContent: AvailableContent[] = [];

let isDataLoaded = false;

// Internal helper to write data, used by readData on initial file creation (SERVER-SIDE ONLY)
async function writeDataInternal<T>(
    filePath: string,
    data: T[],
    fsMod: any, // typeof import('fs/promises')
    _pathMod: any, // typeof import('path')
    dataDir: string
): Promise<void> {
  if (typeof window === 'undefined') { // Server-side only
    try {
      await fsMod.mkdir(dataDir, { recursive: true });
      await fsMod.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Error writing data to ${filePath}:`, error);
    }
  }
}

// Helper function to read JSON data from a file (SERVER-SIDE ONLY for FS access)
async function readData<T>(fileName: string, defaultData: T[] = []): Promise<T[]> {
  if (typeof window !== 'undefined') {
    return JSON.parse(JSON.stringify(defaultData)); // Client-side, return default
  }

  // Server-side execution
  try {
    const fsPromises = await import('fs/promises');
    const path = await import('path');
    const dataDirLocal = path.join(process.cwd(), 'src', 'data');
    const filePathLocal = path.join(dataDirLocal, fileName);

    await fsPromises.mkdir(dataDirLocal, { recursive: true });
    const fileContent = await fsPromises.readFile(filePathLocal, 'utf-8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data) && data.length > 0 ? data : JSON.parse(JSON.stringify(defaultData));
  } catch (error: any) {
    if (error.code === 'ENOENT' && defaultData.length > 0 && typeof window === 'undefined') {
      const fsPromises = await import('fs/promises');
      const path = await import('path');
      const dataDirLocal = path.join(process.cwd(), 'src', 'data');
      const filePathLocal = path.join(dataDirLocal, fileName);
      await writeDataInternal(filePathLocal, defaultData, fsPromises, path, dataDirLocal);
      return JSON.parse(JSON.stringify(defaultData));
    }
    console.error(`Error reading data from ${fileName} (server-side):`, error);
    return JSON.parse(JSON.stringify(defaultData));
  }
}


// Helper function to write JSON data to a file (SERVER-SIDE ONLY for FS access)
async function writeDataToFile<T>(fileName: string, data: T[]): Promise<void> {
  if (typeof window !== 'undefined') {
    console.warn(`File system write for ${fileName} skipped on client-side.`);
    return;
  }

  // Server-side execution
  try {
    const fsPromises = await import('fs/promises');
    const path = await import('path');
    const dataDirLocal = path.join(process.cwd(), 'src', 'data');
    const filePathLocal = path.join(dataDirLocal, fileName);
    
    await fsPromises.mkdir(dataDirLocal, { recursive: true });
    await fsPromises.writeFile(filePathLocal, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing data to ${fileName} (server-side):`, error);
  }
}


function reSyncAiAvailableContent() {
  aiAvailableContent = availableContentItems.map(item => ({
    id: item.id,
    name: item.title || item.id,
  }));
}

// Function to load all data
async function loadAllData() {
  availableContentItems = await readData<ContentItem>(contentItemsJsonFile, defaultContentItems);
  mockPlaylists = await readData<Playlist>(playlistsJsonFile, defaultPlaylists);
  mockDevices = await readData<DisplayDevice>(devicesJsonFile, defaultDevices);
  
  reSyncAiAvailableContent();
  isDataLoaded = true;
}

export async function ensureDataLoaded() {
  if (!isDataLoaded) {
    await loadAllData();
  }
}

// --- Mutator Functions ---

export async function addMockDevice(name: string): Promise<DisplayDevice> {
  await ensureDataLoaded();
  const newDevice: DisplayDevice = {
    id: `display-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    status: 'online', // Default status for new devices
    lastSeen: new Date().toISOString(),
    currentPlaylistId: undefined, // No playlist assigned initially
  };
  mockDevices.push(newDevice);
  await writeDataToFile(devicesJsonFile, mockDevices);
  return newDevice;
}

export async function updateMockDevice(id: string, updates: Partial<Omit<DisplayDevice, 'id' | 'lastSeen' | 'status'>>): Promise<DisplayDevice | undefined> {
  await ensureDataLoaded();
  const deviceIndex = mockDevices.findIndex(d => d.id === id);
  if (deviceIndex === -1) {
    return undefined;
  }
  // Preserve existing status and lastSeen, only update name and currentPlaylistId
  mockDevices[deviceIndex] = {
    ...mockDevices[deviceIndex],
    name: updates.name ?? mockDevices[deviceIndex].name,
    currentPlaylistId: updates.currentPlaylistId // Allows setting to undefined to remove playlist
  };
  await writeDataToFile(devicesJsonFile, mockDevices);
  return mockDevices[deviceIndex];
}

export async function deleteMockDevice(id: string): Promise<boolean> {
  await ensureDataLoaded();
  const initialLength = mockDevices.length;
  mockDevices = mockDevices.filter(d => d.id !== id);
  if (mockDevices.length < initialLength) {
    await writeDataToFile(devicesJsonFile, mockDevices);
    return true;
  }
  return false;
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
  mockPlaylists.push(newPlaylist);
  await writeDataToFile(playlistsJsonFile, mockPlaylists);
  return newPlaylist;
}

export async function updateMockPlaylist(id: string, name: string, description: string | undefined, itemIds: string[]): Promise<Playlist | undefined> {
  await ensureDataLoaded();
  const playlistIndex = mockPlaylists.findIndex(p => p.id === id);
  if (playlistIndex === -1) {
    return undefined;
  }
  const updatedPlaylist: Playlist = {
    ...mockPlaylists[playlistIndex],
    name,
    description,
    items: itemIds.map(itemId => availableContentItems.find(item => item.id === itemId)).filter(Boolean) as ContentItem[],
    updatedAt: new Date().toISOString(),
  };
  mockPlaylists[playlistIndex] = updatedPlaylist;
  await writeDataToFile(playlistsJsonFile, mockPlaylists);
  return updatedPlaylist;
}

export async function addMockContentItem(itemData: Omit<ContentItem, 'id'>): Promise<ContentItem> {
  await ensureDataLoaded();
  const newItem: ContentItem = {
    id: `content-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...itemData,
  };
  availableContentItems.push(newItem);
  reSyncAiAvailableContent();
  await writeDataToFile(contentItemsJsonFile, availableContentItems);
  return newItem;
}

export async function updateMockContentItem(id: string, itemData: Partial<Omit<ContentItem, 'id'>>): Promise<ContentItem | undefined> {
  await ensureDataLoaded();
  const itemIndex = availableContentItems.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    return undefined;
  }
  const updatedItem = { ...availableContentItems[itemIndex], ...itemData, id };
  availableContentItems[itemIndex] = updatedItem;
  reSyncAiAvailableContent();

  mockPlaylists = mockPlaylists.map(playlist => ({
    ...playlist,
    items: playlist.items.map(item => item.id === id ? updatedItem : item)
  }));
  await writeDataToFile(contentItemsJsonFile, availableContentItems);
  await writeDataToFile(playlistsJsonFile, mockPlaylists);
  return updatedItem;
}

export async function deleteMockContentItem(id: string): Promise<boolean> {
  await ensureDataLoaded();
  const itemIndex = availableContentItems.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    return false;
  }
  availableContentItems.splice(itemIndex, 1);
  reSyncAiAvailableContent();

  mockPlaylists = mockPlaylists.map(playlist => ({
    ...playlist,
    items: playlist.items.filter(item => item.id !== id),
  }));
  await writeDataToFile(contentItemsJsonFile, availableContentItems);
  await writeDataToFile(playlistsJsonFile, mockPlaylists);
  return true;
}
