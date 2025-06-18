
"use client"; 

import Link from 'next/link';
import Image from 'next/image';
import { availableContentItems, deleteMockContentItem } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit3, Trash2, Image as ImageIcon, LibraryBig, ExternalLink, Video, Globe, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
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
import type { ContentItem } from '@/lib/types';

const TypeIcon = ({ type }: { type: ContentItem['type'] }) => {
  switch (type) {
    case 'image':
      return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
    case 'video':
      return <Video className="h-5 w-5 text-muted-foreground" />;
    case 'web':
      return <Globe className="h-5 w-5 text-muted-foreground" />;
    case 'pdf':
      return <FileText className="h-5 w-5 text-muted-foreground" />;
    default:
      return <ExternalLink className="h-5 w-5 text-muted-foreground" />;
  }
};


export default function ContentLibraryPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = (itemId: string, itemTitle?: string) => {
    // TODO: Implement actual deletion from backend if files were uploaded to server
    // For now, it just removes from mockData
    const success = deleteMockContentItem(itemId);
    if (success) {
      toast({
        title: "Content Item Deleted",
        description: `Item "${itemTitle || itemId}" has been removed.`,
      });
      router.refresh(); 
    } else {
      toast({
        title: "Deletion Failed",
        description: `Could not delete item "${itemTitle || itemId}".`,
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <LibraryBig className="mr-3 h-8 w-8" /> Content Library
          </h1>
          <p className="text-muted-foreground font-body">
            Manage your individual content assets like images, videos, and web links.
          </p>
        </div>
        <Link href="/admin/content/create" passHref legacyBehavior>
          <Button variant="default" className="font-headline">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Content
          </Button>
        </Link>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">All Content Items</CardTitle>
          <CardDescription className="font-body">
            Browse, edit, or delete content items. These items can be used in your playlists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableContentItems.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="font-headline text-2xl">No Content Items Yet</h3>
              <p className="font-body text-muted-foreground">
                Add your first piece of content to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] font-headline">Preview</TableHead>
                  <TableHead className="font-headline">Title</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Type</TableHead>
                  <TableHead className="font-headline hidden lg:table-cell">Duration</TableHead>
                  <TableHead className="text-right font-headline">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableContentItems.map((item: ContentItem) => (
                  <TableRow key={item.id} className="font-body hover:bg-muted/50">
                    <TableCell>
                      {item.type === 'image' && item.url ? (
                        <div className="w-16 h-10 rounded bg-muted overflow-hidden relative border">
                           <Image 
                             src={item.url} 
                             alt={item.title || 'Content preview'} 
                             layout="fill" 
                             objectFit="cover" 
                             data-ai-hint={item.dataAiHint || 'thumbnail'} 
                             unoptimized={item.url.startsWith("https://placehold.co") || item.url.startsWith('blob:')}
                             onError={(e) => { e.currentTarget.src = "https://placehold.co/64x40/CCCCCC/FFFFFF?text=Error";}} // Basic error placeholder
                           />
                        </div>
                      ) : (
                        <div className="w-16 h-10 rounded bg-muted flex items-center justify-center border">
                          <TypeIcon type={item.type} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-primary">{item.title || <span className="italic text-muted-foreground">Untitled</span>}</TableCell>
                    <TableCell className="hidden md:table-cell capitalize">
                        <Badge variant="secondary">{item.type}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{item.duration}s</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-1" asChild>
                        <Link href={`/admin/content/${item.id}/edit`}>
                          <Edit3 className="h-4 w-4" />
                          <span className="sr-only">Edit Content</span>
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Content</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the content item
                              "{item.title || item.id}" and remove it from all playlists. 
                              {item.url.startsWith('/uploads/') && " The uploaded file will remain on the server but will no longer be tracked by the application."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id, item.title)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
