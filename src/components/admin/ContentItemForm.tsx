
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { Textarea } // Assuming Textarea might be used for other fields, keeping import
from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { addMockContentItem, updateMockContentItem, availableContentItems } from "@/data/mockData";
import type { ContentItem } from "@/lib/types";
import { useEffect, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";

const contentItemFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  type: z.enum(["image", "video", "web", "pdf"], {
    required_error: "You need to select a content type.",
  }),
  url: z.string().min(1, { message: "Content source/URL is required." }), // URL can be local path after upload
  duration: z.coerce.number().min(1, { message: "Duration must be at least 1 second." }),
  dataAiHint: z.string().optional().refine(value => !value || value.split(' ').length <= 2, {
    message: "AI hint can have at most two words."
  }),
});

type ContentItemFormValues = z.infer<typeof contentItemFormSchema>;

interface ContentItemFormProps {
  contentId?: string;
}

export default function ContentItemForm({ contentId }: ContentItemFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditMode = !!contentId;

  const existingContentItem = isEditMode
    ? availableContentItems.find(c => c.id === contentId)
    : undefined;

  const [previewUrl, setPreviewUrl] = useState<string | undefined>(existingContentItem?.url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now()); // To reset file input

  const form = useForm<ContentItemFormValues>({
    resolver: zodResolver(contentItemFormSchema),
    defaultValues: {
      title: "",
      type: "image",
      url: "",
      duration: 10,
      dataAiHint: "",
    },
  });

  const watchedUrl = form.watch("url");
  const watchedType = form.watch("type");

  useEffect(() => {
    if (watchedType === "image" && form.formState.errors.url === undefined && watchedUrl) {
      if (watchedUrl.startsWith('/') || watchedUrl.startsWith('http')) { // Local or remote URL
         setPreviewUrl(watchedUrl);
      } else {
        setPreviewUrl(undefined);
      }
    } else {
      setPreviewUrl(undefined);
    }
  }, [watchedUrl, watchedType, form.formState.errors.url]);


  useEffect(() => {
    if (isEditMode && existingContentItem) {
      form.reset({
        title: existingContentItem.title || "",
        type: existingContentItem.type,
        url: existingContentItem.url,
        duration: existingContentItem.duration,
        dataAiHint: existingContentItem.dataAiHint || "",
      });
      if (existingContentItem.type === 'image') {
        setPreviewUrl(existingContentItem.url);
      }
    }
  }, [isEditMode, existingContentItem, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      if (watchedType === "image") {
        setPreviewUrl(URL.createObjectURL(file)); // Show local preview for image
      }
      form.setValue("url", file.name); // Temporarily set URL to file name, will be replaced by server URL
    }
  };

  async function onSubmit(values: ContentItemFormValues) {
    setIsUploading(true);
    let finalUrl = values.url;

    if (selectedFile && (values.type === 'image' || values.type === 'video' || values.type === 'pdf')) {
      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'File upload failed');
        }
        finalUrl = result.url; // Use the URL from the server
      } catch (error) {
        const message = error instanceof Error ? error.message : "File upload failed.";
        toast({
          title: "Upload Failed",
          description: message,
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
    } else if (values.type === 'web' && !values.url.startsWith('http')) {
        toast({
          title: "Invalid URL",
          description: "Web content URL must start with http or https.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
    }


    try {
      const submittedValues: Omit<ContentItem, 'id'> = {
        title: values.title,
        type: values.type,
        url: finalUrl,
        duration: values.duration,
        dataAiHint: values.dataAiHint || undefined,
      };

      if (isEditMode && contentId) {
        updateMockContentItem(contentId, submittedValues);
        toast({
          title: "Content Item Updated",
          description: `Content item "${values.title}" has been successfully updated.`,
        });
      } else {
        addMockContentItem(submittedValues);
        toast({
          title: "Content Item Created",
          description: `Content item "${values.title}" has been successfully created.`,
        });
      }
      router.push("/admin/content");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: isEditMode ? "Update Failed" : "Creation Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setFileInputKey(Date.now()); // Reset file input
    }
  }
  
  // Reset file input and preview if type changes
  useEffect(() => {
    setSelectedFile(null);
    setFileInputKey(Date.now());
    if (watchedType !== 'image') {
        if (!isEditMode || (existingContentItem && existingContentItem.type !== 'image')) {
             setPreviewUrl(undefined);
        }
    }
    // If switching back to web, clear the URL if it was a filename placeholder
    if (watchedType === 'web' && form.getValues('url') && !form.getValues('url').startsWith('http')) {
        if (!isEditMode || (existingContentItem && existingContentItem.type !== 'web' )) {
            form.setValue('url', '');
        }
    }

  }, [watchedType, isEditMode, existingContentItem, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" id="content-item-form">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-headline">Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Summer Sale Banner" {...field} className="font-body"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-headline">Content Type</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  if (value !== 'image' && value !== 'video' && value !== 'pdf') {
                    setSelectedFile(null); // Clear file if not an uploadable type
                  }
                  form.setValue('url', ''); // Clear URL on type change to avoid validation issues with file names
                  setPreviewUrl(undefined);
                }} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Select a content type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="web">Web Page</SelectItem>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription className="font-body">
                Select the type of content you are adding.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {(watchedType === "image" || watchedType === "video" || watchedType === "pdf") ? (
          <FormItem>
            <FormLabel className="font-headline flex items-center">
              <UploadCloud className="w-4 h-4 mr-2 text-muted-foreground" />
              Upload File
            </FormLabel>
            <FormControl>
              <Input 
                key={fileInputKey} // Used to reset the file input
                type="file" 
                onChange={handleFileChange} 
                className="font-body"
                accept={
                  watchedType === "image" ? "image/*" :
                  watchedType === "video" ? "video/*" :
                  watchedType === "pdf" ? ".pdf" : ""
                }
              />
            </FormControl>
            <FormDescription className="font-body">
              Select a file to upload. Max 50MB (not enforced by this prototype).
              {isEditMode && existingContentItem?.url && !selectedFile && <span className="block mt-1">Current file: <a href={existingContentItem.url} target="_blank" rel="noopener noreferrer" className="underline">{existingContentItem.url.split('/').pop()}</a>. Uploading a new file will replace it.</span>}
            </FormDescription>
            {/* Display filename if selected, useful if URL is not a previewable type */}
            {selectedFile && <p className="text-sm text-muted-foreground">Selected file: {selectedFile.name}</p>}
            <FormMessage>{form.formState.errors.url?.message}</FormMessage> 
          </FormItem>
        ) : (
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-headline">Content URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/webpage" {...field} className="font-body"/>
                </FormControl>
                <FormDescription className="font-body">
                  Enter the full URL for the web content (e.g., https://example.com).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {previewUrl && watchedType === "image" && (
          <div className="space-y-2">
            <FormLabel className="font-headline">Image Preview</FormLabel>
            <div className="relative w-full max-w-md h-64 rounded border bg-muted overflow-hidden">
               <Image src={previewUrl} alt="Content preview" layout="fill" objectFit="contain" unoptimized={previewUrl.startsWith("https://placehold.co") || previewUrl.startsWith('blob:')} />
            </div>
          </div>
        )}


        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-headline">Duration (seconds)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="10" {...field} className="font-body"/>
              </FormControl>
              <FormDescription className="font-body">
                How long this item should be displayed in a playlist.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="dataAiHint"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-headline">AI Hint (Optional for Images)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., nature landscape" {...field} className="font-body"/>
              </FormControl>
              <FormDescription className="font-body">
                One or two keywords for AI image search (e.g., 'office building', 'abstract pattern'). Used if this is a placeholder image.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         {/* Submit buttons are in the parent page, but we need one here if this form is used standalone for submission */}
         {/* This form has its own submit logic, so the buttons on parent page for 'edit' and 'create' content use this form's submit */}
         <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => router.push('/admin/content')} className="font-body" disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" form="content-item-form" className="font-headline" disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save Content Item')}
            </Button>
          </div>
      </form>
    </Form>
  );
}
