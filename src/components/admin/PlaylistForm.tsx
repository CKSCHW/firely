
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { addMockPlaylist, updateMockPlaylist, mockPlaylists, availableContentItems, ensureDataLoaded } from "@/data/mockData";
import type { Playlist, ContentItem } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

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

interface PlaylistFormProps {
  playlistId?: string;
}

export default function PlaylistForm({ playlistId }: PlaylistFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditMode = !!playlistId;
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [formContentItems, setFormContentItems] = useState<ContentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistFormSchema),
    defaultValues: {
      name: "",
      description: "",
      itemIds: [],
    },
  });

  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingData(true);
      await ensureDataLoaded(); // Ensure all data (content items, playlists) are loaded
      setFormContentItems([...availableContentItems]);

      if (isEditMode && playlistId) {
        const existingPlaylist = mockPlaylists.find(p => p.id === playlistId);
        if (existingPlaylist) {
          form.reset({
            name: existingPlaylist.name,
            description: existingPlaylist.description || "",
            itemIds: existingPlaylist.items.map(item => item.id),
          });
        } else {
           toast({ title: "Error", description: "Playlist not found.", variant: "destructive" });
           router.push("/admin/playlists");
        }
      }
      setIsLoadingData(false);
    }
    loadInitialData();
  }, [isEditMode, playlistId, form, toast, router]);


  async function onSubmit(values: PlaylistFormValues) {
    setIsSubmitting(true);
    try {
      if (isEditMode && playlistId) {
        await updateMockPlaylist(playlistId, values.name, values.description, values.itemIds);
        toast({
          title: "Playlist Updated",
          description: `Playlist "${values.name}" has been successfully updated.`,
        });
      } else {
        await addMockPlaylist(values.name, values.description, values.itemIds);
        toast({
          title: "Playlist Created",
          description: `Playlist "${values.name}" has been successfully created.`,
        });
      }
      router.push("/admin/playlists");
      router.refresh(); 
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: isEditMode ? "Update Failed" : "Creation Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" id="playlist-form">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-headline">Playlist Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Morning Announcements" {...field} className="font-body" disabled={isSubmitting}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-headline">Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Briefly describe the playlist's content or purpose."
                  className="resize-none font-body"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="itemIds"
          render={() => (
            <FormItem>
              <div>
                <FormLabel className="text-base font-headline">Content Items</FormLabel>
                <FormDescription className="font-body">
                  Select the content items to include in this playlist.
                </FormDescription>
              </div>
              <Card className="border-dashed">
                <CardContent className="p-0">
                 <ScrollArea className="h-72 rounded-md border">
                    <div className="p-4 space-y-3">
                  {formContentItems.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No content items available. Please add content items first.</p>}
                  {formContentItems.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name="itemIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item.id}
                            className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm hover:bg-muted/50 transition-colors"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  const currentIds = field.value || [];
                                  const newIds = checked
                                    ? [...currentIds, item.id]
                                    : currentIds.filter((value) => value !== item.id);
                                  field.onChange(newIds);
                                }}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                            <FormLabel className="font-medium font-body text-sm cursor-pointer">
                              {item.title || item.id}
                            </FormLabel>
                            <FormDescription className="text-xs font-body">
                                Type: {item.type}, Duration: {item.duration}s
                            </FormDescription>
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                  </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => router.push('/admin/playlists')} className="font-body" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="playlist-form" className="font-headline" disabled={isSubmitting || isLoadingData || formContentItems.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save Playlist')}
            </Button>
          </div>
      </form>
    </Form>
  );
}
