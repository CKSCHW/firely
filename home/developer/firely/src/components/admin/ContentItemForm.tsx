
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
import * as pdfjs from 'pdfjs-dist';

// Configure the PDF.js worker from a CDN. This is crucial for client-side processing.
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const contentItemFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  type: z.enum(["image", "video", "web", "pdf"], {
    required_error: "You need to select a content type.",
  }),
  url: z.string().optional(),
  duration: z.coerce.number().min(1, { message: "Duration must be at least 1 second." }),
  dataAiHint: z.string().optional().refine(value => !value || value.split(' ').length <= 2, {
    message: "AI hint can have at most two words."
  }),
  pageImageUrls: z.array(z.string()).optional(),
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentPersistedUrl, setCurrentPersistedUrl] = useState<string | undefined>();
  const [fileInputKey, setFileInputKey] = useState(Date.now());


  const form = useForm<ContentItemFormValues>({
    resolver: zodResolver(contentItemFormSchema),
    defaultValues: {
      title: "",
      type: "image",
      url: "",
      duration: 10,
      dataAiHint: "",
      pageImageUrls: [],
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
            pageImageUrls: existingContentItem.pageImageUrls || [],
          });
          setCurrentPersistedUrl(existingContentItem.url);
          if (existingContentItem.type === 'image' && existingContentItem.url) {
            setPreviewUrl(existingContentItem.url);
          }
        }
      }
      setIsLoadingData(false);
    }
    loadInitialData();
  }, [isEditMode, contentId, form]);


  useEffect(() => {
    if (watchedType === "image" && watchedUrl && (watchedUrl.startsWith('blob:') || watchedUrl.startsWith('/') || watchedUrl.startsWith('http'))) {
       setPreviewUrl(watchedUrl);
    } else {
      setPreviewUrl(undefined);
    }
  }, [watchedUrl, watchedType]);

  const processPdf = async (file: File) => {
    setIsProcessing(true);
    toast({ title: "Processing PDF", description: "Uploading original and converting pages. This might take a moment..." });
    
    // Step 1: Upload original PDF to get its URL for storage/reference
    const pdfFormData = new FormData();
    pdfFormData.append('file', file);
    try {
        const pdfUploadResponse = await fetch('/api/upload', { method: 'POST', body: pdfFormData });
        const pdfUploadResult = await pdfUploadResponse.json();
        if (!pdfUploadResult.success) throw new Error(pdfUploadResult.error || 'Failed to upload original PDF.');
        form.setValue('url', pdfUploadResult.url, { shouldDirty: true });
        toast({ title: "Original PDF Uploaded", description: "Now converting pages to images..." });
    } catch(e) {
        toast({ title: "Error", description: `Failed to upload original PDF: ${e instanceof Error ? e.message : String(e)}`, variant: "destructive" });
        setIsProcessing(false);
        setFileInputKey(Date.now());
        return;
    }

    // Step 2: Process PDF to images on the client
    try {
        const fileReader = new FileReader();
        fileReader.onload = async (event) => {
            if (!event.target?.result) {
                throw new Error("Could not read the PDF file.");
            }
            try {
                const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
                const pdf = await pdfjs.getDocument(typedarray).promise;

                const pageImageUrls: string[] = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 }); // Use a reasonable scale
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const context = canvas.getContext('2d');
                    if (!context) throw new Error("Could not get canvas context");
                    
                    await page.render({ canvasContext: context, viewport: viewport }).promise;

                    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
                    if (!blob) throw new Error(`Failed to create blob for page ${i}`);
                    
                    const imageFile = new File([blob], `page_${i}_from_${file.name}.jpg`, { type: 'image/jpeg' });
                    const imageFormData = new FormData();
                    imageFormData.append('file', imageFile);

                    const res = await fetch('/api/upload', { method: 'POST', body: imageFormData });
                    const result = await res.json();
                    if (!result.success) throw new Error(`Failed to upload page ${i}: ${result.error}`);
                    pageImageUrls.push(result.url);
                }
                form.setValue('pageImageUrls', pageImageUrls, { shouldDirty: true, shouldValidate: true });
                toast({ title: "Success", description: `PDF processed successfully into ${pageImageUrls.length} pages.` });
            } catch (e) {
                 toast({ title: "PDF Conversion Error", description: `An error occurred while converting pages: ${e instanceof Error ? e.message : String(e)}`, variant: "destructive" });
            } finally {
                setIsProcessing(false);
                setFileInputKey(Date.now());
            }
        }
        fileReader.readAsArrayBuffer(file);
    } catch (e) {
        toast({ title: "PDF Reading Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
        setIsProcessing(false);
        setFileInputKey(Date.now());
    }
  }


  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) return;
    
    const file = event.target.files[0];
    const currentType = form.getValues("type");
    
    if (currentType === 'pdf') {
        await processPdf(file);
    } else {
        setIsProcessing(true);
        toast({ title: "Uploading...", description: `Sending "${file.name}" to the server.` });
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Upload failed');
            form.setValue('url', result.url, { shouldDirty: true, shouldValidate: true });
            if (currentType === 'image') {
              setPreviewUrl(result.url);
            }
            toast({ title: "Upload Successful", description: `File "${file.name}" uploaded.`});
        } catch (e) {
            toast({ title: "Upload Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
        } finally {
            setIsProcessing(false);
            setFileInputKey(Date.now());
        }
    }
  }, [form, toast]);

  async function onSubmit(values: ContentItemFormValues) {
    if (values.type === 'image' || values.type === 'video') {
        if (!values.url) {
            toast({ title: "Missing File", description: "Please upload a file for this content type.", variant: "destructive" });
            return;
        }
    }
     if (values.type === 'web' && (!values.url || !values.url.startsWith('http'))) {
      toast({ title: "Invalid URL", description: "Please provide a valid URL for web content.", variant: "destructive" });
      return;
    }
    if (values.type === 'pdf' && (!values.url || !values.pageImageUrls || values.pageImageUrls.length === 0)) {
        toast({ title: "PDF Not Fully Processed", description: "Please upload a PDF file and wait for it to be converted before saving.", variant: "destructive" });
        return;
    }
    
    setIsProcessing(true);
    try {
      let actionResult;
      if (isEditMode && contentId) {
        actionResult = await updateContentItemAction(contentId, values);
      } else {
        actionResult = await createContentItemAction(values);
      }

      if (actionResult?.success === false) {
        toast({
          title: isEditMode ? "Update Failed" : "Creation Failed",
          description: actionResult.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      } else {
        toast({
          title: isEditMode ? "Content Item Updated" : "Content Item Created",
          description: `Content item "${values.title}" has been saved.`,
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
    }
  }
  
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
                onValueChange={(value) => { field.onChange(value); form.setValue('url', ''); form.setValue('pageImageUrls', []); setPreviewUrl(undefined); }} 
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
                Select the type of content. PDFs will be converted to images in your browser upon upload.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedType === "web" ? (
           <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-headline">Content URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/webpage" {...field} className="font-body" disabled={isProcessing}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
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
                {isEditMode && currentPersistedUrl && <span className="block mt-1">Current file/URL: <a href={currentPersistedUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">{currentPersistedUrl.split('/').pop()}</a>. Uploading a new file will replace it.</span>}
                {form.watch('pageImageUrls', []).length > 0 && <span className="block mt-1 text-green-600">Successfully processed {form.watch('pageImageUrls', []).length} pages from PDF.</span>}
              </FormDescription>
          </FormItem>
        )}
        
        {previewUrl && watchedType === "image" && (
          <div className="space-y-2">
            <FormLabel className="font-headline">Image Preview</FormLabel>
            <div className="relative w-full max-w-md h-64 rounded border bg-muted overflow-hidden">
               <Image src={previewUrl} alt="Content preview" fill={true} style={{objectFit: "contain"}} unoptimized />
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
                For PDFs, this is the total time for all pages to display. Each page will get an equal share.
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
                One or two keywords for AI image search.
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
              {isProcessing ? 'Processing...' : (isEditMode ? 'Save Changes' : 'Save Content Item')}
            </Button>
          </div>
      </form>
    </Form>
  );
}
