import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PlaylistForm from "@/components/admin/PlaylistForm"; 

export default function CreatePlaylistPage() {
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
          <h1 className="text-3xl font-headline font-semibold text-primary">Create New Playlist</h1>
          <p className="text-muted-foreground font-body">
            Configure your new playlist and add content items.
          </p>
        </div>
      </div>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">Playlist Details</CardTitle>
          <CardDescription className="font-body">
            Fill in the information below to create a new playlist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlaylistForm />
          <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" asChild className="font-body">
              <Link href="/admin/playlists">Cancel</Link>
            </Button>
            <Button type="submit" form="playlist-form" className="font-headline">Save Playlist</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
