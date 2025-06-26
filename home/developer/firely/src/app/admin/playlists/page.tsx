
"use client";
import Link from 'next/link';
import { getPlaylists } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit3, Trash2, Clock, Film, CalendarDays, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState, useCallback } from 'react';
import type { Playlist } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { deletePlaylistAction } from './actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PlaylistsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
      toast({ title: "Error", description: "Could not load playlists.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const handleDelete = useCallback(async (playlistId: string, playlistName: string) => {
    setIsDeleting(playlistId);
    try {
      const result = await deletePlaylistAction(playlistId);
      if (result.success) {
        toast({
          title: "Playlist Deleted",
          description: `Playlist "${playlistName}" has been successfully removed.`,
        });
        await fetchPlaylists();
      } else {
        toast({
          title: "Deletion Failed",
          description: result.message || `Could not delete playlist "${playlistName}".`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Deletion Error",
        description: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  }, [toast, fetchPlaylists]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold text-primary">Playlists</h1>
          <p className="text-muted-foreground font-body">
            Create, edit, and manage your content playlists.
          </p>
        </div>
        <Link href="/admin/playlists/create" asChild>
          <Button variant="default" className="font-headline">
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Playlist
          </Button>
        </Link>
      </div>

      {playlists.length === 0 ? (
        <Card className="text-center py-12 shadow-md">
          <CardHeader>
            <Film className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="font-headline text-2xl">No Playlists Yet</CardTitle>
            <CardDescription className="font-body">
              Get started by creating your first content playlist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/playlists/create" asChild>
              <Button variant="default" size="lg" className="font-headline">
                Create Playlist
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">{playlist.name}</CardTitle>
                <CardDescription className="font-body text-sm h-10 overflow-hidden text-ellipsis">
                  {playlist.description || 'No description available.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div className="flex items-center text-sm text-muted-foreground font-body">
                  <Film className="mr-2 h-4 w-4" />
                  <span>{playlist.items.length} items</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground font-body">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Updated {formatDistanceToNow(new Date(playlist.updatedAt), { addSuffix: true })}</span>
                </div>
                 <div className="flex items-center text-sm text-muted-foreground font-body">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <span>Created {formatDistanceToNow(new Date(playlist.createdAt), { addSuffix: true })}</span>
                </div>
                <div className="pt-2">
                  <h4 className="font-semibold text-xs mb-1 text-muted-foreground uppercase tracking-wider">Content Types:</h4>
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(playlist.items.map(item => item.type))].map(type => (
                      <Badge key={type} variant="secondary" className="capitalize font-body">{type}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/playlists/${playlist.id}/edit`}>
                    <Edit3 className="mr-1.5 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={!!isDeleting}>
                      <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the playlist "{playlist.name}" and remove it from all associated device schedules.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={!!isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(playlist.id, playlist.name)} disabled={!!isDeleting}>
                        {isDeleting === playlist.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
