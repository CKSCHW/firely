import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PlaylistForm from "@/components/admin/PlaylistForm"; 
import { mockPlaylists } from "@/data/mockData"; 

export default function EditPlaylistPage({ params }: { params: { playlistId: string } }) {
  const playlist = mockPlaylists.find(p => p.id === params.playlistId);
  
  if (!playlist) {
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
          <PlaylistForm playlistId={params.playlistId} />
          <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" asChild className="font-body">
              <Link href="/admin/playlists">Cancel</Link>
            </Button>
            <Button type="submit" form="playlist-form" className="font-headline">Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
