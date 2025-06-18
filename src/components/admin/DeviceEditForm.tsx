
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { mockDevices, mockPlaylists, ensureDataLoaded } from "@/data/mockData";
import type { DisplayDevice, Playlist, ScheduleEntry } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Trash2, PlusCircle, CalendarClock } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { updateDeviceAction } from "@/app/admin/devices/actions";

const NO_PLAYLIST_VALUE = "__NO_PLAYLIST__";
const DAYS_OF_WEEK = [
  { id: 0, label: "Sun" }, { id: 1, label: "Mon" }, { id: 2, label: "Tue" },
  { id: 3, label: "Wed" }, { id: 4, label: "Thu" }, { id: 5, label: "Fri" },
  { id: 6, label: "Sat" }
];

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
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleEntry[]>([]);

  const [newSchedulePlaylistId, setNewSchedulePlaylistId] = useState<string>("");
  const [newScheduleStartTime, setNewScheduleStartTime] = useState<string>("");
  const [newScheduleEndTime, setNewScheduleEndTime] = useState<string>("");
  const [newScheduleDays, setNewScheduleDays] = useState<number[]>([]);


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
        setCurrentSchedule(deviceToEdit.schedule || []);
      } else {
        toast({
          title: "Error",
          description: "Device not found.",
          variant: "destructive",
        });
        // router.push("/admin/devices"); // Navigation will be handled by server action on failure or success
      }
      setIsLoadingData(false);
    }
    if (deviceId) { 
      loadDeviceData();
    }
  }, [deviceId, form, toast, router]);

  const handleAddScheduleEntry = useCallback(() => {
    if (!newSchedulePlaylistId || !newScheduleStartTime || !newScheduleEndTime || newScheduleDays.length === 0) {
      toast({ title: "Missing Information", description: "Please fill all fields for the schedule entry.", variant: "destructive" });
      return;
    }
    if (newScheduleStartTime >= newScheduleEndTime) {
      toast({ title: "Invalid Time", description: "Start time must be before end time.", variant: "destructive" });
      return;
    }

    const newEntry: ScheduleEntry = {
      id: uuidv4(),
      playlistId: newSchedulePlaylistId,
      startTime: newScheduleStartTime,
      endTime: newScheduleEndTime,
      daysOfWeek: [...newScheduleDays].sort((a,b) => a-b),
    };
    setCurrentSchedule(prev => [...prev, newEntry]);
    setNewSchedulePlaylistId("");
    setNewScheduleStartTime("");
    setNewScheduleEndTime("");
    setNewScheduleDays([]);
  }, [newSchedulePlaylistId, newScheduleStartTime, newScheduleEndTime, newScheduleDays, toast]);

  const handleRemoveScheduleEntry = useCallback((entryId: string) => {
    setCurrentSchedule(prev => prev.filter(entry => entry.id !== entryId));
  }, []);

  const handleDayToggle = useCallback((dayId: number) => {
    setNewScheduleDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  }, []);

  async function onSubmit(values: DeviceFormValues) {
    setIsSubmitting(true);
    try {
      const result = await updateDeviceAction(deviceId, values, currentSchedule);

      if (result?.success === false) {
         toast({
          title: "Update Failed",
          description: result.message || "Could not update the device.",
          variant: "destructive",
        });
      } else {
        toast({ // Toast for success is good, redirect is handled by server action
          title: "Device Update Submitted",
          description: `Device "${values.deviceName}" update processing.`,
        });
        // Redirect will be handled by the server action
      }
    } catch (error) { // Catch unexpected errors from calling the action
      toast({
        title: "Update Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingData && deviceId) { 
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
                <Input placeholder="e.g., Lobby Screen Main" {...field} disabled={isSubmitting || isLoadingData} />
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
              <FormLabel className="font-headline">Default/Fallback Playlist</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value === NO_PLAYLIST_VALUE ? undefined : value);
                }} 
                value={field.value || NO_PLAYLIST_VALUE} 
                disabled={isSubmitting || isLoadingData}
              >
                <FormControl>
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Select a playlist (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_PLAYLIST_VALUE}>No Fallback Playlist</SelectItem>
                  {availablePlaylists.map(playlist => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      {playlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="font-body">
                This playlist will play if no other playlist is scheduled for the current time.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><CalendarClock className="mr-2 h-5 w-5 text-primary"/> Playlist Schedule</CardTitle>
            <CardDescription className="font-body">
              Define specific times and days for playlists to run on this device. Fallback playlist is used if no schedule matches.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentSchedule.length > 0 ? (
              <ul className="space-y-3">
                {currentSchedule.map(entry => {
                  const playlistName = availablePlaylists.find(p => p.id === entry.playlistId)?.name || entry.playlistId;
                  const days = entry.daysOfWeek.map(d => DAYS_OF_WEEK.find(day => day.id === d)?.label).filter(Boolean).join(', ');
                  return (
                    <li key={entry.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                      <div>
                        <p className="font-semibold text-primary">{playlistName}</p>
                        <p className="text-sm text-muted-foreground">
                          {days}: {entry.startTime} - {entry.endTime}
                        </p>
                      </div>
                      <Button variant="ghost" type="button" size="icon" onClick={() => handleRemoveScheduleEntry(entry.id)} disabled={isSubmitting || isLoadingData}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Remove schedule item</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No schedule entries defined. Add one below.</p>
            )}

            <div className="border-t pt-6 space-y-4">
              <h4 className="font-semibold font-headline text-md">Add New Schedule Entry</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <FormItem>
                  <FormLabel>Playlist</FormLabel>
                  <Select value={newSchedulePlaylistId} onValueChange={setNewSchedulePlaylistId} disabled={isSubmitting || isLoadingData}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select playlist" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlaylists.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <Input type="time" value={newScheduleStartTime} onChange={e => setNewScheduleStartTime(e.target.value)} disabled={isSubmitting || isLoadingData} />
                </FormItem>
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <Input type="time" value={newScheduleEndTime} onChange={e => setNewScheduleEndTime(e.target.value)} disabled={isSubmitting || isLoadingData} />
                </FormItem>
              </div>
              <FormItem>
                <FormLabel>Days of the Week</FormLabel>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.id}`}
                        checked={newScheduleDays.includes(day.id)}
                        onCheckedChange={() => handleDayToggle(day.id)}
                        disabled={isSubmitting || isLoadingData}
                      />
                      <label htmlFor={`day-${day.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
              </FormItem>
              <Button type="button" onClick={handleAddScheduleEntry} variant="outline" size="sm" className="font-body" disabled={isSubmitting || isLoadingData}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add to Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/devices")}
            className="font-body"
            disabled={isSubmitting || isLoadingData}
          >
            Cancel
          </Button>
          <Button type="submit" form="device-edit-form" className="font-headline" disabled={isSubmitting || (isLoadingData && !!deviceId) }>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Device Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
