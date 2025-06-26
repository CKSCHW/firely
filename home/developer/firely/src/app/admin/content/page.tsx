
"use client"; 

import Link from 'next/link';
import Image from 'next/image';
import { getContentItems } from '@/data/mockData';
import { deleteContentItemAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit3, Trash2, Image as ImageIcon, LibraryBig, ExternalLink, Video, Globe, FileText, Loader2 } from 'lucide-react';
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
import { useEffect, useState, useCallback } from 'react';

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
  const [isLoading, setIsLoading] = useState(true);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);


  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getContentItems();
      setContentItems(items);
    } catch (error) {
      console.error("Failed to fetch content items:", error);
      toast({ title: "Error", description: "Could not load content library.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleDelete = useCallback(async (itemId: string, itemTitle?: string) => {
    setIsDeleting(itemId);
    try {
      const result = await deleteContentItemAction(itemId);
      if (result.success) {
        toast({
          title: "Content Item Deleted",
          description: `Item "${itemTitle || itemId}" has been removed.`,
        });
        await fetchContent();
      } else {
        toast({
          title: "Deletion Failed",
          description: result.message || `Could not delete item "${itemTitle || itemId}".`,
          variant: "destructive",
        });
      }
    } catch (error) {
       toast({
        title: "Deletion Error",
        description: `An error occurred while deleting: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  }, [toast, fetchContent]);
  
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
          <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <LibraryBig className="mr-3 h-8 w-8" /> Content Library
          </h1>
          <p className="text-muted-foreground font-body">
            Manage your individual content assets like images, videos, and web links.
          </p>
        </div>
        <Link href="/admin/content/create" asChild>
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
          {contentItems.length === 0 ? (
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
                {contentItems.map((item: ContentItem) => (
                  <TableRow key={item.id} className="font-body hover:bg-muted/50">
                    <TableCell>
                      {item.type === 'image' && item.url ? (
                        <div className="w-16 h-10 rounded bg-muted overflow-hidden relative border">
                           <Image 
                             src={item.url} 
                             alt={item.title || 'Content preview'} 
                             fill={true}
                             style={{ objectFit: "cover" }}
                             data-ai-hint={item.dataAiHint || 'thumbnail'} 
                             unoptimized={item.url.startsWith("https://placehold.co") || item.url.startsWith('blob:') || item.url.startsWith('/uploads/')}
                             onError={(e) => { e.currentTarget.src = "https://placehold.co/64x40/CCCCCC/FFFFFF?text=Error";}}
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
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!!isDeleting}>
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
                              {item.url && item.url.startsWith('/uploads/') && " The uploaded file will remain on the server but will no longer be tracked by the application."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={!!isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id, item.title)} disabled={!!isDeleting}>
                              {isDeleting === item.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
