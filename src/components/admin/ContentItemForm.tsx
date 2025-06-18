
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { addMockContentItem, updateMockContentItem, availableContentItems, ensureDataLoaded } from "@/data/mockData";
import type { ContentItem } from "@/lib/types";
import { useEffect, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";

const contentItemFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  type: z.enum(["image", "video", "web", "pdf"], {
    required_error: "You need to select a content type.",
  }),
  url: z.string().min(1, { message: "Content source/URL is required." }),
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

  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Covers both uploading and saving
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentPersistedUrl, setCurrentPersistedUrl] = useState<string | undefined>();


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
    async function loadInitialData() {
      setIsLoadingData(true);
      await ensureDataLoaded(); // Ensure content items are loaded

      if (isEditMode && contentId) {
        const existingContentItem = availableContentItems.find(c => c.id === contentId);
        if (existingContentItem) {
          form.reset({
            title: existingContentItem.title || "",
            type: existingContentItem.type,
            url: existingContentItem.url, // This will be the persisted URL
            duration: existingContentItem.duration,
            dataAiHint: existingContentItem.dataAiHint || "",
          });
          setCurrentPersistedUrl(existingContentItem.url);
          if (existingContentItem.type === 'image' && existingContentItem.url) {
            setPreviewUrl(existingContentItem.url);
          }
        } else {
          toast({ title: "Error", description: "Content item not found.", variant: "destructive" });
          router.push("/admin/content");
        }
      }
      setIsLoadingData(false);
    }
    loadInitialData();
  }, [isEditMode, contentId, form, toast, router]);


  useEffect(() => {
    // Update preview based on URL field, which might be a blob URL or a persisted URL
    if (watchedType === "image") {
       if (watchedUrl && (watchedUrl.startsWith('blob:') || watchedUrl.startsWith('/') || watchedUrl.startsWith('http'))) {
         setPreviewUrl(watchedUrl);
       } else if (!selectedFile && currentPersistedUrl && watchedType === 'image') {
         // If no new file selected, and there's a persisted URL for an image, show that
         setPreviewUrl(currentPersistedUrl);
       } else {
         setPreviewUrl(undefined);
       }
    } else {
      setPreviewUrl(undefined);
    }
  }, [watchedUrl, watchedType, selectedFile, currentPersistedUrl]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      // For images, show a local blob preview immediately
      if (watchedType === "image") {
        const localPreview = URL.createObjectURL(file);
        setPreviewUrl(localPreview);
        // Do NOT set form URL here, it will be set after successful upload
      }
      // For other types, we don't set a preview from the blob
      // The form.setValue("url", file.name) was problematic; URL should only be set post-upload.
      // We can indicate the selected file separately if needed.
    }
  };

  async function onSubmit(values: ContentItemFormValues) {
    setIsProcessing(true);
    let finalUrl = values.url; // Use the current URL value from the form (could be existing URL)

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
        setIsProcessing(false);
        return;
      }
    } else if (values.type === 'web' && !values.url.startsWith('http')) {
        toast({
          title: "Invalid URL",
          description: "Web content URL must start with http or https.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
    }


    try {
      const submittedValues: Omit<ContentItem, 'id'> = {
        title: values.title,
        type: values.type,
        url: finalUrl, // Use the potentially updated finalUrl
        duration: values.duration,
        dataAiHint: values.dataAiHint || undefined,
      };

      if (isEditMode && contentId) {
        await updateMockContentItem(contentId, submittedValues);
        toast({
          title: "Content Item Updated",
          description: `Content item "${values.title}" has been successfully updated.`,
        });
      } else {
        await addMockContentItem(submittedValues);
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
      setIsProcessing(false);
      setSelectedFile(null);
      setFileInputKey(Date.now()); 
    }
  }
  
  useEffect(() => {
    // When type changes:
    setSelectedFile(null); // Clear any selected file
    setFileInputKey(Date.now()); // Reset the file input element
    
    // If not in edit mode, or if the original type was different, clear the URL field
    if (!isEditMode || (availableContentItems.find(c => c.id === contentId)?.type !== watchedType)) {
         if (watchedType === 'web') {
            form.setValue('url', 'https://');
         } else {
            form.setValue('url', ''); // Clear URL for non-web types unless it's an existing item being edited
         }
    }
    
    if (watchedType !== 'image') {
      setPreviewUrl(undefined); // Clear image preview if type is not image
    } else if (isEditMode && contentId) {
        // If switching to image type in edit mode, try to set preview from existing persisted URL
        const existingItem = availableContentItems.find(c => c.id === contentId);
        if (existingItem?.type === 'image' && existingItem.url) {
            setPreviewUrl(existingItem.url);
            form.setValue('url', existingItem.url); // Ensure form URL matches
        } else {
            form.setValue('url', ''); // Clear URL if existing item is not an image
        }
    }


  }, [watchedType, isEditMode, contentId, form]);

  if (isLoadingData && isEditMode) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
                <Input placeholder="e.g., Summer Sale Banner" {...field} className="font-body" disabled={isProcessing}/>
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
                }} 
                defaultValue={field.value}
                disabled={isProcessing}
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
                key={fileInputKey} 
                type="file" 
                onChange={handleFileChange} 
                className="font-body"
                accept={
                  watchedType === "image" ? "image/*" :
                  watchedType === "video" ? "video/*" :
                  watchedType === "pdf" ? ".pdf" : ""
                }
                disabled={isProcessing}
              />
            </FormControl>
            <FormDescription className="font-body">
              Select a file to upload. 
              {isEditMode && currentPersistedUrl && !selectedFile && <span className="block mt-1">Current file: <a href={currentPersistedUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">{currentPersistedUrl.split('/').pop()}</a>. Uploading a new file will replace it.</span>}
            </FormDescription>
            {selectedFile && <p className="text-sm text-muted-foreground mt-1">New file selected: {selectedFile.name}</p>}
             {/* Display error for URL field if it's related to file handling (e.g. upload failed and URL not set) */}
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
                  <Input placeholder="https://example.com/webpage" {...field} className="font-body" disabled={isProcessing}/>
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
               <Image src={previewUrl} alt="Content preview" layout="fill" objectFit="contain" unoptimized={previewUrl.startsWith("https://placehold.co") || previewUrl.startsWith('blob:') || previewUrl.startsWith('/uploads')} />
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
                <Input type="number" placeholder="10" {...field} className="font-body" disabled={isProcessing}/>
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
                <Input placeholder="e.g., nature landscape" {...field} className="font-body" disabled={isProcessing}/>
              </FormControl>
              <FormDescription className="font-body">
                One or two keywords for AI image search (e.g., 'office building', 'abstract pattern'). Used if this is a placeholder image.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => router.push('/admin/content')} className="font-body" disabled={isProcessing}>
              Cancel
            </Button>
            <Button type="submit" form="content-item-form" className="font-headline" disabled={isProcessing || (isLoadingData && isEditMode)}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessing ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save Content Item')}
            </Button>
          </div>
      </form>
    </Form>
  );
}
