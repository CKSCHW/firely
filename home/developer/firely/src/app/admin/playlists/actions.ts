
'use server';

import { z } from 'zod';
import { addPlaylist, updatePlaylist, deletePlaylist } from '@/data/mockData';
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
    await addPlaylist(values.name, values.description, values.itemIds);
  } catch (error) {
    console.error("Error creating playlist action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Playlist creation failed.' };
  }
  revalidatePath('/admin/playlists');
  redirect('/admin/playlists');
}

export async function updatePlaylistAction(playlistId: string, values: PlaylistFormValues) {
  try {
    const result = await updatePlaylist(playlistId, values.name, values.description, values.itemIds);
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

export async function deletePlaylistAction(playlistId: string) {
  try {
    const success = await deletePlaylist(playlistId);
    if (!success) {
      return { success: false, message: 'Playlist not found or deletion failed.' };
    }
  } catch (error) {
    console.error("Error deleting playlist action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'An unexpected error occurred during playlist deletion.' };
  }

  revalidatePath('/admin/playlists');
  revalidatePath('/admin/devices'); // Revalidate devices as their schedules may have changed.
  return { success: true };
}
