
"use client"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import PlaylistForm from "@/components/admin/PlaylistForm"; 
import { mockPlaylists, ensureDataLoaded } from "@/data/mockData"; 
import { useEffect, useState } from "react";
import type { Playlist } from "@/lib/types";
import { useParams } from 'next/navigation';

export default function EditPlaylistPage() {
  const paramsHook = useParams<{ playlistId: string }>();
  const playlistId = paramsHook.playlistId;

  const [playlist, setPlaylist] = useState<Playlist | undefined | null>(undefined); 
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPlaylist() {
      setIsLoading(true);
      await ensureDataLoaded(); 
      const foundPlaylist = mockPlaylists.find(p => p.id === playlistId);
      setPlaylist(foundPlaylist || null);
      setIsLoading(false);
    }
    if (playlistId) {
      loadPlaylist();
    }
  }, [playlistId]);
  
  if (isLoading || playlist === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (playlist === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/playlists">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-headline font-semibold text-destructive">Playlist Not Found</h1>
        </div>
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <p className="font-body text-center text-muted-foreground">
              The playlist you are trying to edit does not exist or could not be loaded.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild>
                <Link href="/admin/playlists">Back to Playlists</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const playlistName = playlist.name;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/playlists">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Playlists</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-semibold text-primary">Edit {playlistName}</h1>
          <p className="text-muted-foreground font-body">
            Update the details and content for this playlist.
          </p>
        </div>
      </div>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">Playlist Configuration</CardTitle>
          <CardDescription className="font-body">
            Modify the playlist information and manage its content items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlaylistForm playlistId={playlistId} />
        </CardContent>
      </Card>
    </div>
  );
}
