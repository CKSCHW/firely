
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

const formSchema = z.object({
  deviceName: z.string().min(3, {
    message: "Device name must be at least 3 characters.",
  }),
});

export default function DeviceRegistrationForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deviceName: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      addMockDevice(values.deviceName);
      toast({
        title: "Device Registered",
        description: `Device "${values.deviceName}" has been successfully registered.`,
      });
      router.push("/admin/devices");
      router.refresh(); // Refresh server components on the target page
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
                <Input placeholder="e.g., Lobby Screen Main" {...field} />
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
          >
            Cancel
          </Button>
          <Button type="submit" className="font-headline">
            Register Device
          </Button>
        </div>
      </form>
    </Form>
  );
}
