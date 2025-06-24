
'use server';

import { z } from 'zod';
import { addMockContentItem, updateMockContentItem } from '@/data/mockData';
import type { ContentItem } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// This schema is a subset of ContentItem for creation/update from the form
const contentItemFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  type: z.enum(["image", "video", "web", "pdf"]),
  url: z.string().min(1, { message: "Content source/URL is required." }), // URL is now directly part of form values
  duration: z.coerce.number().min(1, { message: "Duration must be at least 1 second." }),
  dataAiHint: z.string().optional().refine(value => !value || value.split(' ').length <= 2, {
    message: "AI hint can have at most two words."
  }),
  pageImageUrls: z.array(z.string()).optional(),
});

type ContentItemFormValues = z.infer<typeof contentItemFormSchema>;

export async function createContentItemAction(values: ContentItemFormValues) {
  try {
    const contentData: Omit<ContentItem, 'id'> = {
        title: values.title,
        type: values.type,
        url: values.url,
        duration: values.duration,
        dataAiHint: values.dataAiHint || undefined,
        pageImageUrls: values.pageImageUrls,
    };
    await addMockContentItem(contentData);
  } catch (error) {
    console.error("Error creating content item action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Content item creation failed.' };
  }
  revalidatePath('/admin/content');
  redirect('/admin/content');
}

export async function updateContentItemAction(contentId: string, values: ContentItemFormValues) {
  try {
    const contentData: Partial<Omit<ContentItem, 'id'>> = {
        title: values.title,
        type: values.type,
        url: values.url,
        duration: values.duration,
        dataAiHint: values.dataAiHint || undefined,
        pageImageUrls: values.pageImageUrls,
    };
    const result = await updateMockContentItem(contentId, contentData);
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
