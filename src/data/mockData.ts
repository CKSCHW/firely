
import type { Playlist, DisplayDevice, ContentItem, AvailableContent } from '@/lib/types';

// Initial default data (used if JSON files don't exist or are empty)
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

// Initialize in-memory stores
export let availableContentItems: ContentItem[] = [];
export let mockPlaylists: Playlist[] = [];
export let mockDevices: DisplayDevice[] = [];
export let aiAvailableContent: AvailableContent[] = [];

let isDataLoaded = false;

// Internal helper to write data, used by readData on initial file creation
async function writeDataInternal<T>(
    filePath: string,
    data: T[],
    fsMod: typeof import('fs/promises'),
    pathMod: typeof import('path'),
    dataDir: string // Pass dataDir to avoid re-calculating pathMod.join(process.cwd(), 'src', 'data')
): Promise<void> {
  try {
    await fsMod.mkdir(dataDir, { recursive: true });
    await fsMod.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing data to ${filePath}:`, error);
    throw new Error(`Failed to save data to ${filePath}`);
  }
}

// Helper function to read JSON data from a file
async function readData<T>(fileName: string, defaultData: T[] = []): Promise<T[]> {
  const fsMod = await import('fs/promises'); // Dynamically import 'fs/promises'
  const pathMod = await import('path');       // Dynamically import 'path'
  const dataDir = pathMod.join(process.cwd(), 'src', 'data');
  const filePath = pathMod.join(dataDir, fileName);

  try {
    await fsMod.mkdir(dataDir, { recursive: true });
    const fileContent = await fsMod.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data) && data.length > 0 ? data : (defaultData.length > 0 ? defaultData : []);
  } catch (error: any) {
    if (error.code === 'ENOENT' && defaultData.length > 0) { // File not found, write default data
      await writeDataInternal(filePath, defaultData, fsMod, pathMod, dataDir);
      return defaultData;
    }
    console.error(`Error reading data from ${filePath}:`, error);
    return defaultData; // Return default if read fails or file empty
  }
}

// Helper function to write JSON data to a file (public facing for mutators)
async function writeDataToFile<T>(fileName: string, data: T[]): Promise<void> {
  const fsMod = await import('fs/promises');
  const pathMod = await import('path');
  const dataDir = pathMod.join(process.cwd(), 'src', 'data');
  const filePath = pathMod.join(dataDir, fileName);
  // For public write, we can re-use writeDataInternal or simplify if fsMod/pathMod are always fresh from dynamic import
  try {
    await fsMod.mkdir(dataDir, { recursive: true });
    await fsMod.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing data to ${filePath}:`, error);
    throw new Error(`Failed to save data to ${filePath}`);
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
  if (isDataLoaded) return;
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

export async function addMockDevice(name: string): Promise<DisplayDevice> {
  await ensureDataLoaded(); // Ensure data is loaded
  const newDevice: DisplayDevice = {
    id: `display-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    status: 'online',
    lastSeen: new Date().toISOString(),
    currentPlaylistId: undefined,
  };
  mockDevices.push(newDevice);
  await writeDataToFile(devicesJsonFile, mockDevices);
  return newDevice;
}

export async function addMockPlaylist(name: string, description: string | undefined, itemIds: string[]): Promise<Playlist> {
  await ensureDataLoaded(); // Ensure data is loaded
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
  await ensureDataLoaded(); // Ensure data is loaded
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
  await ensureDataLoaded(); // Ensure data is loaded
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
  await ensureDataLoaded(); // Ensure data is loaded
  const itemIndex = availableContentItems.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    return undefined;
  }
  const updatedItem = { ...availableContentItems[itemIndex], ...itemData, id }; // Ensure ID is preserved
  availableContentItems[itemIndex] = updatedItem;
  reSyncAiAvailableContent();

  mockPlaylists = mockPlaylists.map(playlist => ({
    ...playlist,
    items: playlist.items.map(item => item.id === id ? updatedItem : item)
  }));
  await writeDataToFile(contentItemsJsonFile, availableContentItems);
  await writeDataToFile(playlistsJsonFile, mockPlaylists); // Save playlists as their items might have changed
  return updatedItem;
}

export async function deleteMockContentItem(id: string): Promise<boolean> {
  await ensureDataLoaded(); // Ensure data is loaded
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
  await writeDataToFile(playlistsJsonFile, mockPlaylists); // Save playlists as their items might have changed
  return true;
}
