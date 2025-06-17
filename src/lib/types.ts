export interface ContentItem {
  id: string;
  type: 'image' | 'video' | 'web';
  url: string;
  duration: number; // in seconds
  title?: string;
  dataAiHint?: string; // For placeholder images on Unsplash
}

export interface Playlist {
  id:string;
  name: string;
  description?: string;
  items: ContentItem[]; // In a real app, these might be IDs, but for mock, full objects are fine.
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface DisplayDevice {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastSeen: string; // ISO date string
  currentPlaylistId?: string;
}

export interface AvailableContent {
  id: string;
  name: string;
  // Other metadata that might be useful for AI suggestions
}
