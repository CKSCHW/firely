
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
import { availableContentItems, ensureDataLoaded } from "@/data/mockData";
import type { ContentItem } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { createContentItemAction, updateContentItemAction } from "@/app/admin/content/actions";

const contentItemFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  type: z.enum(["image", "video", "web", "pdf"], {
    required_error: "You need to select a content type.",
  }),
  url: z.string().optional(), // Made URL optional here for client-side validation
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
  const [isProcessing, setIsProcessing] = useState(false);
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
      await ensureDataLoaded(); 

      if (isEditMode && contentId) {
        const existingContentItem = availableContentItems.find(c => c.id === contentId);
        if (existingContentItem) {
          form.reset({
            title: existingContentItem.title || "",
            type: existingContentItem.type,
            url: existingContentItem.url, 
            duration: existingContentItem.duration,
            dataAiHint: existingContentItem.dataAiHint || "",
          });
          setCurrentPersistedUrl(existingContentItem.url);
          if (existingContentItem.type === 'image' && existingContentItem.url) {
            setPreviewUrl(existingContentItem.url);
          }
        } else {
          toast({ title: "Error", description: "Content item not found.", variant: "destructive" });
          // router.push("/admin/content"); // Navigation handled by server action
        }
      }
      setIsLoadingData(false);
    }
    loadInitialData();
  }, [isEditMode, contentId, form, toast, router]);


  useEffect(() => {
    if (watchedType === "image") {
       if (watchedUrl && (watchedUrl.startsWith('blob:') || watchedUrl.startsWith('/') || watchedUrl.startsWith('http'))) {
         setPreviewUrl(watchedUrl);
       } else if (!selectedFile && currentPersistedUrl && watchedType === 'image') {
         setPreviewUrl(currentPersistedUrl);
       } else {
         setPreviewUrl(undefined);
       }
    } else {
      setPreviewUrl(undefined);
    }
  }, [watchedUrl, watchedType, selectedFile, currentPersistedUrl]);


  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      const localPreview = URL.createObjectURL(file);
      if (form.getValues("type") === "image") {
        setPreviewUrl(localPreview);
        form.setValue("url", localPreview, { shouldValidate: false, shouldDirty: true }); // Set for preview, don't validate yet
      } else {
        form.setValue("url", "", { shouldValidate: false }); // Clear URL if file is for non-image, to rely on upload
      }
    } else {
      setSelectedFile(null);
      // If file is cleared, revert URL to persisted URL if in edit mode, or clear it
      if (isEditMode && currentPersistedUrl) {
        form.setValue("url", currentPersistedUrl, { shouldValidate: true, shouldDirty: true });
         if (form.getValues("type") === "image") setPreviewUrl(currentPersistedUrl);
      } else {
        form.setValue("url", "", { shouldValidate: true, shouldDirty: true });
         if (form.getValues("type") === "image") setPreviewUrl(undefined);
      }
    }
  }, [form, isEditMode, currentPersistedUrl]);

  async function onSubmit(values: ContentItemFormValues) { // values.url might be undefined
    setIsProcessing(true);
    let finalDeterminedUrl = values.url; // Initialize with URL from form field (if any, could be blob)

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
        finalDeterminedUrl = result.url; // URL from successful upload
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
    }

    // Validate that we have a final URL before proceeding
    if (!finalDeterminedUrl || finalDeterminedUrl.trim() === '' || finalDeterminedUrl.startsWith('blob:')) {
      // If finalDeterminedUrl is still a blob URL, it means upload didn't happen for it
      // or it was a preview that shouldn't be saved.
      let userMessage = "Content source/URL is required. Please upload a file or provide a valid direct URL.";
      if (values.type === 'web') {
        userMessage = "Web content URL is required and must start with http or https.";
      } else if (finalDeterminedUrl && finalDeterminedUrl.startsWith('blob:')) {
         userMessage = "File selected for preview, but an error occurred. Please try uploading again or provide a direct URL."
      }
      
      toast({
        title: "Missing Or Invalid Content URL",
        description: userMessage,
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    if (values.type === 'web' && !finalDeterminedUrl.startsWith('http')) {
      toast({
        title: "Invalid URL Format",
        description: "Web content URL must start with http or https.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }
    
    // Server action expects a string URL.
    const actionValues = { 
        title: values.title,
        type: values.type,
        url: finalDeterminedUrl, // This is now guaranteed to be a non-empty string
        duration: values.duration,
        dataAiHint: values.dataAiHint
     };

    try {
      let actionResult;
      if (isEditMode && contentId) {
        actionResult = await updateContentItemAction(contentId, actionValues);
      } else {
        actionResult = await createContentItemAction(actionValues);
      }

      if (actionResult?.success === false) {
        toast({
          title: isEditMode ? "Update Failed" : "Creation Failed",
          description: actionResult.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      } else {
        toast({
          title: isEditMode ? "Content Item Update Submitted" : "Content Item Creation Submitted",
          description: `Content item "${values.title}" processing.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: isEditMode ? "Update Error" : "Creation Error",
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
    const currentType = form.getValues("type");
    setSelectedFile(null); 
    setFileInputKey(Date.now()); 
    
    if (!isEditMode || (isEditMode && contentId && availableContentItems.find(c => c.id === contentId)?.type !== currentType)) {
         if (currentType === 'web') {
             // Ensure URL is preserved or set to https if switching to web type
            const currentUrlValue = form.getValues('url');
            if (!currentUrlValue || currentUrlValue.startsWith('blob:')) {
                 form.setValue('url', 'https://');
            }
         } else {
            // If switching to a file type, and current URL is not a real persisted URL (e.g., it was a web URL or blob)
            // clear it, or set to persisted if available.
            const currentUrlValue = form.getValues('url');
            if (currentUrlValue && (currentUrlValue.startsWith('http') && currentType !== 'web' && !currentUrlValue.startsWith(currentPersistedUrl || '_____')) || currentUrlValue.startsWith('blob:')) {
                 form.setValue('url', isEditMode && currentPersistedUrl && availableContentItems.find(c=>c.id===contentId)?.type === currentType ? currentPersistedUrl : '');
            } else if (!isEditMode) {
                 form.setValue('url', '');
            }
         }
    }
    
    if (currentType !== 'image') {
      setPreviewUrl(undefined); 
    } else {
        const currentUrl = form.getValues('url');
        if (currentUrl && (currentUrl.startsWith('http') || currentUrl.startsWith('/') || currentUrl.startsWith('blob:'))) {
            setPreviewUrl(currentUrl);
        } else if (isEditMode && contentId && currentPersistedUrl && availableContentItems.find(c=>c.id===contentId)?.type === 'image') {
            setPreviewUrl(currentPersistedUrl);
             if (form.getValues('url') !== currentPersistedUrl) form.setValue('url', currentPersistedUrl);
        } else {
            setPreviewUrl(undefined);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedType, isEditMode, contentId]);

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
          <>
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
                Select a file to upload. This will take precedence over the URL field below if a file is chosen.
                {isEditMode && currentPersistedUrl && !selectedFile && <span className="block mt-1">Current file/URL: <a href={currentPersistedUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">{currentPersistedUrl.split('/').pop()}</a>. Uploading a new file will replace it.</span>}
              </FormDescription>
              {selectedFile && <p className="text-sm text-muted-foreground mt-1">New file selected: {selectedFile.name}. This will be uploaded.</p>}
            </FormItem>
             <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-headline">Or Provide Direct URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.jpg or /uploads/file.jpg" {...field} className="font-body" disabled={isProcessing || !!selectedFile}/>
                  </FormControl>
                  <FormDescription className="font-body">
                    Direct URL to the content. If you upload a file above, this field will be ignored (or can be left blank).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : ( // For 'web' type
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

