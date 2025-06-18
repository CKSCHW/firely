
'use server';

import { z } from 'zod';
import { addMockPlaylist, updateMockPlaylist } from '@/data/mockData';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const playlistFormSchema = z.object({
  name: z.string().min(3, {
    message: "Playlist name must be at least 3 characters.",
  }),
  description: z.string().optional(),
  itemIds: z.array(z.string()).min(1, {
    message: "Please select at least one content item.",
  }),
});

type PlaylistFormValues = z.infer<typeof playlistFormSchema>;

export async function createPlaylistAction(values: PlaylistFormValues) {
  try {
    await addMockPlaylist(values.name, values.description, values.itemIds);
  } catch (error) {
    console.error("Error creating playlist action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Playlist creation failed.' };
  }
  revalidatePath('/admin/playlists');
  redirect('/admin/playlists');
}

export async function updatePlaylistAction(playlistId: string, values: PlaylistFormValues) {
  try {
    const result = await updateMockPlaylist(playlistId, values.name, values.description, values.itemIds);
    if (!result) {
      return { success: false, message: 'Playlist not found or update failed.' };
    }
  } catch (error) {
    console.error("Error updating playlist action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Playlist update failed.' };
  }
  revalidatePath('/admin/playlists');
  revalidatePath(`/admin/playlists/${playlistId}/edit`);
  redirect('/admin/playlists');
}
