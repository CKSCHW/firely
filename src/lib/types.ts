export interface ContentItem {
  id: string;
  type: 'image' | 'video' | 'web' | 'pdf';
  url: string;
  duration: number; // in seconds
  title?: string;
  dataAiHint?: string; // For placeholder images on Unsplash
}

export interface ScheduleEntry {
  id: string; // Unique ID for the schedule entry
  playlistId: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  daysOfWeek: number[]; // 0 (Sunday) to 6 (Saturday)
}

export interface Playlist {
  id:string;
  name: string;
  description?: string;
  items: ContentItem[]; 
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface DisplayDevice {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastSeen: string; // ISO date string
  currentPlaylistId?: string; // Fallback playlist
  schedule?: ScheduleEntry[];
}

export interface AvailableContent {
  id: string;
  name: string;
  // Other metadata that might be useful for AI suggestions
}
