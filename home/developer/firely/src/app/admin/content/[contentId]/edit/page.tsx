
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, LibraryBig } from "lucide-react";
import ContentItemForm from "@/components/admin/ContentItemForm";
import { getContentItem } from "@/data/mockData";
import type { ContentItem } from "@/lib/types";

// This is now a Server Component
export default async function EditContentItemPage({ params }: { params: { contentId: string } }) {
  const contentId = params.contentId;
  const contentItem = await getContentItem(contentId);

  if (!contentItem) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/content">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-headline font-semibold text-destructive">Content Item Not Found</h1>
        </div>
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <p className="font-body text-center text-muted-foreground">
              The content item you are trying to edit does not exist or could not be loaded.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild>
                <Link href="/admin/content">Back to Content Library</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contentItemTitle = contentItem.title || "Untitled Content";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/content">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Content Library</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <LibraryBig className="mr-3 h-8 w-8" /> Edit {contentItemTitle}
          </h1>
          <p className="text-muted-foreground font-body">
            Update the details for this content item.
          </p>
        </div>
      </div>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">Content Item Configuration</CardTitle>
          <CardDescription className="font-body">
            Modify the content item information. Upload new files if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContentItemForm initialData={contentItem} />
        </CardContent>
      </Card>
    </div>
  );
}
