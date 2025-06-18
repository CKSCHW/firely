
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { addMockDevice } from "@/data/mockData";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
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
      deviceName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await addMockDevice(values.deviceName);
      toast({
        title: "Device Registered",
        description: `Device "${values.deviceName}" has been successfully registered.`,
      });
      router.push("/admin/devices");
      router.refresh(); 
    } catch (error) {
      let message = "Could not register the new device. Please try again.";
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: "Registration Failed",
        description: message,
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
          name="deviceName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Lobby Screen Main" {...field} disabled={isSubmitting} />
              </FormControl>
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
