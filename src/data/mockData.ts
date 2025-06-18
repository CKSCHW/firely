
import type { Playlist, DisplayDevice, ContentItem, AvailableContent, ScheduleEntry } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

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
    schedule: [
      { id: uuidv4(), playlistId: 'playlist-2', startTime: '09:00', endTime: '17:00', daysOfWeek: [1,2,3,4,5] } // Mon-Fri, 9 AM - 5 PM
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
      { id: uuidv4(), playlistId: 'playlist-2', startTime: '08:00', endTime: '12:00', daysOfWeek: [1,2,3,4,5] }, // Mon-Fri, 8 AM - 12 PM
      { id: uuidv4(), playlistId: 'playlist-1', startTime: '12:01', endTime: '18:00', daysOfWeek: [1,2,3,4,5] }  // Mon-Fri, 12:01 PM - 6 PM
    ]
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

async function writeDataInternal<T>(
    filePath: string,
    data: T[],
    fsMod: any, 
    pathMod: any, 
    dataDir: string
): Promise<void> {
  if (typeof window === 'undefined') { 
    try {
      await fsMod.mkdir(dataDir, { recursive: true });
      await fsMod.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Error writing data to ${filePath}:`, error);
    }
  }
}

async function readData<T>(fileName: string, defaultData: T[] = []): Promise<T[]> {
  if (typeof window !== 'undefined') {
    return JSON.parse(JSON.stringify(defaultData));
  }

  let fsPromises, path;
  try {
    fsPromises = await import('fs/promises');
    path = await import('path');
    const dataDirLocal = path.join(process.cwd(), 'src', 'data');
    const filePathLocal = path.join(dataDirLocal, fileName);

    try {
      await fsPromises.mkdir(dataDirLocal, { recursive: true });
      const fileContent = await fsPromises.readFile(filePathLocal, 'utf-8');
      const data = JSON.parse(fileContent);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      } else if (Array.isArray(data) && data.length === 0 && defaultData.length === 0) {
        // If file exists and is an empty array, and default is also empty, return empty array.
        return [];
      }
      else {
        await writeDataInternal(filePathLocal, defaultData, fsPromises, path, dataDirLocal);
        return JSON.parse(JSON.stringify(defaultData));
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        await writeDataInternal(filePathLocal, defaultData, fsPromises, path, dataDirLocal);
        return JSON.parse(JSON.stringify(defaultData));
      }
      console.error(`Error reading or processing data from ${fileName} (server-side):`, error);
      return JSON.parse(JSON.stringify(defaultData));
    }
  } catch (e) {
    console.error(`Failed to import fs/promises or path on server:`, e);
    return JSON.parse(JSON.stringify(defaultData));
  }
}


async function writeDataToFile<T>(fileName: string, data: T[]): Promise<void> {
  if (typeof window === 'undefined') { 
    try {
      const fsPromises = await import('fs/promises');
      const path = await import('path');
      const dataDirLocal = path.join(process.cwd(), 'src', 'data');
      const filePathLocal = path.join(dataDirLocal, fileName);
      
      await fsPromises.mkdir(dataDirLocal, { recursive: true });
      await fsPromises.writeFile(filePathLocal, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`Data successfully written to ${filePathLocal}`);
    } catch (error) {
      console.error(`Error writing data to ${fileName} (server-side):`, error);
    }
  } else {
    console.warn(`File system write for ${fileName} skipped on client-side.`);
  }
}


function reSyncAiAvailableContent() {
  aiAvailableContent = availableContentItems.map(item => ({
    id: item.id,
    name: item.title || item.id,
  }));
}

export async function ensureDataLoaded() {
  if (!isDataLoaded) {
    console.log('Initial data load starting...');
    availableContentItems = await readData<ContentItem>(contentItemsJsonFile, defaultContentItems);
    mockPlaylists = await readData<Playlist>(playlistsJsonFile, defaultPlaylists);
    mockDevices = await readData<DisplayDevice>(devicesJsonFile, defaultDevices);
    
    reSyncAiAvailableContent();
    isDataLoaded = true;
    console.log('Initial data load complete.');
    console.log('Loaded devices:', mockDevices.length);
    console.log('Loaded playlists:', mockPlaylists.length);
    console.log('Loaded content items:', availableContentItems.length);
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
  mockDevices.push(newDevice);
  await writeDataToFile(devicesJsonFile, mockDevices);
  return newDevice;
}

export async function updateMockDevice(id: string, updates: Partial<Omit<DisplayDevice, 'id' | 'lastSeen' | 'status'>> & { schedule?: ScheduleEntry[] }): Promise<DisplayDevice | undefined> {
  await ensureDataLoaded();
  const deviceIndex = mockDevices.findIndex(d => d.id === id);
  if (deviceIndex === -1) {
    console.error(`Device with id ${id} not found for update.`);
    return undefined;
  }
  
  mockDevices[deviceIndex] = {
    ...mockDevices[deviceIndex],
    name: updates.name ?? mockDevices[deviceIndex].name,
    currentPlaylistId: updates.currentPlaylistId, 
    schedule: updates.schedule ?? mockDevices[deviceIndex].schedule, 
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
  // Also write playlists if content items within them were updated (their references might change if not careful)
  // The current updateMockContentItem correctly updates the items array in mockPlaylists by replacing the item.
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
