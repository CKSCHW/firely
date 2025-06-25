
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
import { useToast } from "@/hooks/use-toast";
import { mockPlaylists, availableContentItems, ensureDataLoaded } from "@/data/mockData";
import type { Playlist, ContentItem } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState, useMemo } from "react";
import { Loader2, ArrowUp, ArrowDown, PlusCircle, X } from "lucide-react";
import { createPlaylistAction, updatePlaylistAction } from "@/app/admin/playlists/actions";

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
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [playlistItems, setPlaylistItems] = useState<ContentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistFormSchema),
    defaultValues: {
      name: "",
      description: "",
      itemIds: [],
    },
  });

  const availableItems = useMemo(() => {
    const currentItemIds = new Set(playlistItems.map(item => item.id));
    return allContent.filter(item => !currentItemIds.has(item.id));
  }, [allContent, playlistItems]);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingData(true);
      await ensureDataLoaded();
      setAllContent([...availableContentItems]);

      if (isEditMode && playlistId) {
        const existingPlaylist = mockPlaylists.find(p => p.id === playlistId);
        if (existingPlaylist) {
          form.reset({
            name: existingPlaylist.name,
            description: existingPlaylist.description || "",
            itemIds: existingPlaylist.items.map(item => item.id),
          });
          setPlaylistItems([...existingPlaylist.items]);
        } else {
           toast({ title: "Error", description: "Playlist not found.", variant: "destructive" });
        }
      }
      setIsLoadingData(false);
    }
    loadInitialData();
  }, [isEditMode, playlistId, form, toast]);

  useEffect(() => {
    const newIds = playlistItems.map(item => item.id);
    const currentFormIds = form.getValues('itemIds');
    
    if (JSON.stringify(newIds) !== JSON.stringify(currentFormIds)) {
        form.setValue('itemIds', newIds, { shouldValidate: true, shouldDirty: true });
    }
  }, [playlistItems, form]);

  const handleAddItem = (item: ContentItem) => {
    setPlaylistItems(currentItems => [...currentItems, item]);
  };

  const handleRemoveItem = (index: number) => {
    setPlaylistItems(currentItems => currentItems.filter((_, i) => i !== index));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === playlistItems.length - 1)) {
        return;
    }

    const newItems = [...playlistItems];
    const item = newItems[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    newItems[index] = newItems[swapIndex];
    newItems[swapIndex] = item;

    setPlaylistItems(newItems);
  };

  async function onSubmit(values: PlaylistFormValues) {
    setIsSubmitting(true);
    try {
      let result;
      if (isEditMode && playlistId) {
        result = await updatePlaylistAction(playlistId, values);
      } else {
        result = await createPlaylistAction(values);
      }

      if (result?.success === false) {
        toast({
          title: isEditMode ? "Update Failed" : "Creation Failed",
          description: result.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      } else {
         toast({
          title: isEditMode ? "Playlist Updated" : "Playlist Created",
          description: `Playlist "${values.name}" has been saved.`,
        });
      }
    } catch (error) {
      toast({
        title: isEditMode ? "Update Error" : "Creation Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
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
                <div className="space-y-1">
                    <FormLabel className="text-base font-headline">Playlist Content & Order</FormLabel>
                    <FormDescription className="font-body">
                      Fügen Sie Elemente aus der Bibliothek hinzu und verwenden Sie die Pfeile, um deren Reihenfolge zu ändern.
                    </FormDescription>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-headline">Available Library Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-96 border rounded-md">
                                {availableItems.length > 0 ? (
                                    <div className="p-2 space-y-1">
                                        {availableItems.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{item.title}</span>
                                                    <span className="text-xs text-muted-foreground capitalize">{item.type} &middot; {item.duration}s</span>
                                                </div>
                                                <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleAddItem(item)}>
                                                    <PlusCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        All items are in the playlist.
                                    </div>
                                )}
                             </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-headline">Items in this Playlist</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96 border rounded-md">
                                {playlistItems.length > 0 ? (
                                     <div className="p-2 space-y-1">
                                         {playlistItems.map((item, index) => (
                                             <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-secondary">
                                                 <div className="flex-grow">
                                                     <p className="font-medium text-sm">{item.title}</p>
                                                      <span className="text-xs text-muted-foreground capitalize">{item.type} &middot; {item.duration}s</span>
                                                 </div>
                                                 <div className="flex items-center gap-1">
                                                     <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveItem(index, 'up')} disabled={index === 0}>
                                                         <ArrowUp className="h-4 w-4" />
                                                     </Button>
                                                     <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveItem(index, 'down')} disabled={index === playlistItems.length - 1}>
                                                         <ArrowDown className="h-4 w-4" />
                                                     </Button>
                                                     <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveItem(index)}>
                                                         <X className="h-4 w-4" />
                                                     </Button>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        Add items from the library to build your playlist.
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
                <FormMessage />
            </FormItem>
            )}
        />
        
         <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => router.push('/admin/playlists')} className="font-body" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="playlist-form" className="font-headline" disabled={isSubmitting || isLoadingData || playlistItems.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save Playlist')}
            </Button>
          </div>
      </form>
    </Form>
  );
}
