
'use server';

import { z } from 'zod';
import { addContentItem, updateContentItem, deleteContentItem } from '@/data/mockData';
import type { ContentItem } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// This schema is a subset of ContentItem for creation/update from the form
const contentItemFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  type: z.enum(["image", "video", "web", "pdf"]),
  url: z.string().optional(), // Optional: for web type or as original PDF url
  duration: z.coerce.number().min(1, { message: "Duration must be at least 1 second." }),
  dataAiHint: z.string().optional().refine(value => !value || value.split(' ').length <= 2, {
    message: "AI hint can have at most two words."
  }),
  pageImageUrls: z.array(z.string()).optional(),
});

type ContentItemFormValues = z.infer<typeof contentItemFormSchema>;

export async function createContentItemAction(values: ContentItemFormValues) {
  try {
    // For non-web/pdf types, URL is required.
    if (values.type === 'image' || values.type === 'video') {
        if (!values.url) {
            return { success: false, message: 'URL is required for image and video types.' };
        }
    }
    
    // For web type, URL is required.
    if (values.type === 'web') {
      if (!values.url) {
        return { success: false, message: 'URL is required for web type.' };
      }
    }

    // For PDF, both original URL and page images are required.
    if (values.type === 'pdf') {
      if (!values.url || !values.pageImageUrls || values.pageImageUrls.length === 0) {
        return { success: false, message: 'PDF requires an original file URL and converted page images.' };
      }
    }
    
    const contentData: Omit<ContentItem, 'id'> = {
        title: values.title,
        type: values.type,
        // URL is now correctly handled based on type; it will be undefined for types that don't need it if not provided.
        url: values.url || '', // Fallback to empty string if url is needed but not present
        duration: values.duration,
        dataAiHint: values.dataAiHint || undefined,
        pageImageUrls: values.pageImageUrls,
    };
    await addContentItem(contentData);
  } catch (error) {
    console.error("Error creating content item action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Content item creation failed.' };
  }
  revalidatePath('/admin/content');
  redirect('/admin/content');
}

export async function updateContentItemAction(contentId: string, values: ContentItemFormValues) {
  try {
     if (values.type === 'image' || values.type === 'video') {
        if (!values.url) {
            return { success: false, message: 'URL is required for image and video types.' };
        }
    }
     if (values.type === 'web') {
      if (!values.url) {
        return { success: false, message: 'URL is required for web type.' };
      }
    }
    if (values.type === 'pdf') {
      if (!values.url || !values.pageImageUrls || values.pageImageUrls.length === 0) {
        return { success: false, message: 'PDF requires an original file URL and converted page images.' };
      }
    }

    const contentData: Partial<Omit<ContentItem, 'id'>> = {
        title: values.title,
        type: values.type,
        url: values.url || '',
        duration: values.duration,
        dataAiHint: values.dataAiHint || undefined,
        pageImageUrls: values.pageImageUrls,
    };
    const result = await updateContentItem(contentId, contentData);
    if (!result) {
      return { success: false, message: 'Content item not found or update failed.' };
    }
  } catch (error) {
    console.error("Error updating content item action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Content item update failed.' };
  }
  revalidatePath('/admin/content');
  revalidatePath(`/admin/content/${contentId}/edit`);
  redirect('/admin/content');
}

export async function deleteContentItemAction(contentId: string) {
  try {
    const success = await deleteContentItem(contentId);
    if (!success) {
      return { success: false, message: 'Content item not found or deletion failed.' };
    }
  } catch (error) {
    console.error("Error deleting content item action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'An unexpected error occurred during content item deletion.' };
  }

  revalidatePath('/admin/content');
  revalidatePath('/admin/playlists'); // Revalidate playlists as they may have changed
  return { success: true };
}
