
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { registerDeviceAction } from "@/app/admin/devices/actions";

const formSchema = z.object({
  deviceId: z.string().min(3, {
    message: "Device ID must be at least 3 characters.",
  }).regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Device ID can only contain letters, numbers, underscores, and hyphens."
  }),
  deviceName: z.string().min(3, {
    message: "Device name must be at least 3 characters.",
  }),
});

export default function DeviceRegistrationForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deviceId: "",
      deviceName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await registerDeviceAction(values);
      if (result?.success === false) {
        toast({
          title: "Registration Failed",
          description: result.message || "Could not register the new device.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Device Registration Submitted",
          description: `Device "${values.deviceName}" with ID "${values.deviceId}" registration processing.`,
        });
        // Redirect is handled by server action
      }
    } catch (error) {
      toast({
        title: "Registration Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="deviceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device ID</FormLabel>
              <FormControl>
                <Input placeholder="e.g., lobby-screen-01" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormDescription>
                Unique identifier for the device (e.g., 'entrance-display', 'meeting-room-tv'). Allowed characters: a-z, A-Z, 0-9, _, -.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="deviceName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Main Lobby Screen (East Wing)" {...field} disabled={isSubmitting} />
              </FormControl>
               <FormDescription>
                A descriptive name for easier identification.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/devices")}
            className="font-body"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" className="font-headline" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Registering...' : 'Register Device'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
