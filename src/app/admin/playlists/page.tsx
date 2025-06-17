import Link from 'next/link';
import { mockPlaylists } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit3, Trash2, Clock, Film, CalendarDays } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PlaylistsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold text-primary">Playlists</h1>
          <p className="text-muted-foreground font-body">
            Create, edit, and manage your content playlists.
          </p>
        </div>
        <Link href="/admin/playlists/create" passHref legacyBehavior>
          <Button variant="default" className="font-headline">
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Playlist
          </Button>
        </Link>
      </div>

      {mockPlaylists.length === 0 ? (
        <Card className="text-center py-12 shadow-md">
          <CardHeader>
            <Film className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="font-headline text-2xl">No Playlists Yet</CardTitle>
            <CardDescription className="font-body">
              Get started by creating your first content playlist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/playlists/create" passHref legacyBehavior>
              <Button variant="default" size="lg" className="font-headline">
                Create Playlist
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockPlaylists.map((playlist) => (
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
                  {[...new Set(playlist.items.map(item => item.type))].map(type => (
                    <Badge key={type} variant="secondary" className="mr-1 mb-1 capitalize font-body">{type}</Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/playlists/${playlist.id}/edit`}>
                    <Edit3 className="mr-1.5 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" disabled> {/* Delete functionality to be added */}
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
