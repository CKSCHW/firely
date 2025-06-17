
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { addMockContentItem, updateMockContentItem, availableContentItems } from "@/data/mockData";
import type { ContentItem } from "@/lib/types";
import { useEffect, useState } from "react";

const contentItemFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  type: z.enum(["image", "video", "web", "pdf"], {
    required_error: "You need to select a content type.",
  }),
  url: z.string().url({ message: "Please enter a valid URL." }),
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
      // Basic check to see if it might be an image URL for preview
      if (/\.(jpeg|jpg|gif|png|webp)$/i.test(watchedUrl)) {
         setPreviewUrl(watchedUrl);
      } else if (watchedUrl.startsWith("https://placehold.co/")) {
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

  function onSubmit(values: ContentItemFormValues) {
    try {
      const submittedValues: Omit<ContentItem, 'id'> = {
        title: values.title,
        type: values.type,
        url: values.url,
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
    }
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-headline">URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/resource.png" {...field} className="font-body"/>
              </FormControl>
              <FormDescription className="font-body">
                Direct link to the image, video, web page, or PDF document. For image placeholders, use e.g., https://placehold.co/600x400.png
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {previewUrl && form.getValues("type") === "image" && (
          <div className="space-y-2">
            <FormLabel className="font-headline">Image Preview</FormLabel>
            <div className="relative w-full max-w-md h-64 rounded border bg-muted overflow-hidden">
               <Image src={previewUrl} alt="Content preview" layout="fill" objectFit="contain" unoptimized={previewUrl.startsWith("https://placehold.co")} />
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
        {/* Submit buttons are handled by the parent page that includes this form */}
      </form>
    </Form>
  );
}
