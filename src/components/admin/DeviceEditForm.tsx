
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateMockDevice, mockDevices, mockPlaylists, ensureDataLoaded } from "@/data/mockData";
import type { DisplayDevice, Playlist } from "@/lib/types";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const NO_PLAYLIST_VALUE = "__NO_PLAYLIST__";

const formSchema = z.object({
  deviceName: z.string().min(3, {
    message: "Device name must be at least 3 characters.",
  }),
  currentPlaylistId: z.string().optional(), 
});

type DeviceFormValues = z.infer<typeof formSchema>;

interface DeviceEditFormProps {
  deviceId: string;
}

export default function DeviceEditForm({ deviceId }: DeviceEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availablePlaylists, setAvailablePlaylists] = useState<Playlist[]>([]);

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deviceName: "",
      currentPlaylistId: undefined,
    },
  });

  useEffect(() => {
    async function loadDeviceData() {
      setIsLoadingData(true);
      await ensureDataLoaded(); 

      const deviceToEdit = mockDevices.find(d => d.id === deviceId);
      setAvailablePlaylists([...mockPlaylists]);

      if (deviceToEdit) {
        form.reset({
          deviceName: deviceToEdit.name,
          currentPlaylistId: deviceToEdit.currentPlaylistId || undefined, 
        });
      } else {
        toast({
          title: "Error",
          description: "Device not found.",
          variant: "destructive",
        });
        router.push("/admin/devices");
      }
      setIsLoadingData(false);
    }
    if (deviceId) { // Ensure deviceId is present before loading
      loadDeviceData();
    }
  }, [deviceId, form, router, toast]);

  async function onSubmit(values: DeviceFormValues) {
    setIsSubmitting(true);
    try {
      const result = await updateMockDevice(deviceId, {
        name: values.deviceName,
        currentPlaylistId: values.currentPlaylistId || undefined, 
      });

      if (result) {
        toast({
          title: "Device Updated",
          description: `Device "${values.deviceName}" has been successfully updated.`,
        });
        router.push("/admin/devices");
        router.refresh();
      } else {
         toast({
          title: "Update Failed",
          description: "Could not find the device to update.",
          variant: "destructive",
        });
      }
    } catch (error) {
      let message = "Could not update the device. Please try again.";
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: "Update Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingData && deviceId) { // Also check deviceId here for consistency
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" id="device-edit-form">
        <FormField
          control={form.control}
          name="deviceName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-headline">Device Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Lobby Screen Main" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentPlaylistId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-headline">Assigned Playlist</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value === NO_PLAYLIST_VALUE ? undefined : value);
                }} 
                value={field.value || NO_PLAYLIST_VALUE} 
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Select a playlist (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_PLAYLIST_VALUE}>No Playlist (None)</SelectItem>
                  {availablePlaylists.map(playlist => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      {playlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="font-body">
                Choose a playlist to assign to this device. Select "No Playlist" to unassign.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/devices")}
            className="font-body"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="device-edit-form" className="font-headline" disabled={isSubmitting || (isLoadingData && !!deviceId) }>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
