
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, LibraryBig } from "lucide-react";
import ContentItemForm from "@/components/admin/ContentItemForm";

export default function CreateContentItemPage() {
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
             <LibraryBig className="mr-3 h-8 w-8" /> Create New Content Item
          </h1>
          <p className="text-muted-foreground font-body">
            Add a new image, video, PDF, or web link to your library.
          </p>
        </div>
      </div>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">Content Item Details</CardTitle>
          <CardDescription className="font-body">
            Fill in the information below for your new content item. Upload files directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContentItemForm />
           {/* Submit buttons are now part of ContentItemForm itself */}
        </CardContent>
      </Card>
    </div>
  );
}
