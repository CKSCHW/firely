import type { Playlist, DisplayDevice, ContentItem, AvailableContent } from '@/lib/types';

export const availableContentItems: ContentItem[] = [
  { id: 'content-1', type: 'image', url: 'https://placehold.co/1920x1080/FF9800/3F51B5?text=Orange+Promo', duration: 7, title: 'Special Orange Promotion', dataAiHint: 'promotion sale' },
  { id: 'content-2', type: 'image', url: 'https://placehold.co/1920x1080/3F51B5/FFFFFF?text=Company+News+Update', duration: 10, title: 'Latest Company News', dataAiHint: 'corporate announcement' },
  { id: 'content-3', type: 'image', url: 'https://placehold.co/1920x1080/4CAF50/FFFFFF?text=New+Green+Product', duration: 12, title: 'Introducing Green Product', dataAiHint: 'product feature' },
  { id: 'content-4', type: 'image', url: 'https://placehold.co/1920x1080/F44336/FFFFFF?text=Important+Red+Alert', duration: 5, title: 'Critical Red Alert', dataAiHint: 'important warning' },
  { id: 'content-5', type: 'image', url: 'https://placehold.co/1920x1080/9C27B0/FFFFFF?text=Upcoming+Purple+Event', duration: 8, title: 'Don\'t Miss Purple Event', dataAiHint: 'upcoming event' },
  { id: 'content-6', type: 'image', url: 'https://placehold.co/1920x1080/00BCD4/FFFFFF?text=Cyan+Services+Info', duration: 10, title: 'Our Cyan Services', dataAiHint: 'service information' },
  { id: 'content-7', type: 'image', url: 'https://placehold.co/1920x1080/FFEB3B/000000?text=Yellow+Highlights', duration: 9, title: 'Yellow Highlights of the Week', dataAiHint: 'weekly summary' },
];

export const aiAvailableContent: AvailableContent[] = availableContentItems.map(item => ({
  id: item.id,
  name: item.title || item.id,
}));

export let mockPlaylists: Playlist[] = [
  {
    id: 'playlist-1',
    name: 'Morning Loop',
    description: 'Content for morning display hours. Includes news and promotions.',
    items: [availableContentItems[0], availableContentItems[1], availableContentItems[5]],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: 'playlist-2',
    name: 'Evening Specials',
    description: 'Promotions and event highlights for the evening.',
    items: [availableContentItems[2], availableContentItems[3], availableContentItems[4], availableContentItems[6]],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'playlist-3',
    name: 'Weekend Showcase',
    description: 'Special content for weekend viewers.',
    items: [availableContentItems[0], availableContentItems[2], availableContentItems[4], availableContentItems[5], availableContentItems[6]],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
];

export const mockDevices: DisplayDevice[] = [
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
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    currentPlaylistId: 'playlist-2',
  },
  {
    id: 'display-103',
    name: 'Meeting Room A Display',
    status: 'online',
    lastSeen: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    currentPlaylistId: 'playlist-3',
  },
  {
    id: 'sample-display-1', // for the /display/sample-display-1 page
    name: 'Sample Demo Display',
    status: 'online',
    lastSeen: new Date().toISOString(),
    currentPlaylistId: 'playlist-1'
  }
];

// Function to add a new device to the mock data
export function addMockDevice(name: string): DisplayDevice {
  const newDevice: DisplayDevice = {
    id: `display-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    status: 'online', // New devices default to online
    lastSeen: new Date().toISOString(),
    currentPlaylistId: undefined, // No playlist assigned initially
  };
  mockDevices.push(newDevice);
  return newDevice;
}

// Function to add a new playlist
export function addMockPlaylist(name: string, description: string | undefined, itemIds: string[]): Playlist {
  const newPlaylist: Playlist = {
    id: `playlist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    description,
    items: itemIds.map(id => availableContentItems.find(item => item.id === id)).filter(Boolean) as ContentItem[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockPlaylists.push(newPlaylist);
  return newPlaylist;
}

// Function to update an existing playlist
export function updateMockPlaylist(id: string, name: string, description: string | undefined, itemIds: string[]): Playlist | undefined {
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
  return updatedPlaylist;
}
