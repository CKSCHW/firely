
"use client";
import { getDevices, getPlaylists } from '@/data/mockData';
import { deleteDeviceAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MonitorSmartphone, Wifi, WifiOff, Clock, Edit, Trash2, PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { DisplayDevice, Playlist } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const HEARTBEAT_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

export default function DevicesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<DisplayDevice[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const playlistMap = useMemo(() => {
    return new Map(playlists.map(p => [p.id, p.name]));
  }, [playlists]);

  const refreshDeviceData = useCallback(async () => {
    // No need to set loading true on interval refresh
    try {
      const [deviceData, playlistData] = await Promise.all([getDevices(), getPlaylists()]);
      setDevices(deviceData);
      setPlaylists(playlistData);
    } catch (error) {
      console.error("Failed to refresh device data:", error);
      toast({ title: "Error", description: "Could not refresh device data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    setIsLoading(true);
    refreshDeviceData();
    const intervalId = setInterval(refreshDeviceData, 30 * 1000); 
    return () => clearInterval(intervalId);
  }, [refreshDeviceData]);

  const handleDeleteDevice = useCallback(async (deviceId: string, deviceName?: string) => {
    setIsDeleting(deviceId);
    try {
      const result = await deleteDeviceAction(deviceId);
      if (result.success) {
        toast({
          title: "Device Deleted",
          description: `Device "${deviceName || deviceId}" has been removed.`,
        });
        await refreshDeviceData();
      } else {
        toast({
          title: "Deletion Failed",
          description: result.message || `Could not delete device "${deviceName || deviceId}".`,
          variant: "destructive",
        });
      }
    } catch (error) {
       toast({
        title: "Deletion Error",
        description: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  }, [toast, refreshDeviceData]);

  const getDeviceEffectiveStatus = (device: DisplayDevice): { status: 'online' | 'offline' | 'unresponsive', label: string } => {
    const lastSeenDate = new Date(device.lastSeen);
    const now = new Date();
    const timeSinceLastSeen = now.getTime() - lastSeenDate.getTime();

    if (device.status === 'online' && timeSinceLastSeen <= HEARTBEAT_TIMEOUT_MS) {
      return { status: 'online', label: 'Online' };
    }
    if (device.status === 'online' && timeSinceLastSeen > HEARTBEAT_TIMEOUT_MS) {
      return { status: 'unresponsive', label: 'Unresponsive' };
    }
    return { status: 'offline', label: 'Offline' };
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold text-primary">Devices</h1>
          <p className="text-muted-foreground font-body">
            Monitor and manage your connected display devices. Status updates every 30 seconds.
          </p>
        </div>
        <Link href="/admin/devices/register" passHref>
          <Button variant="default" className="font-headline">
              <PlusCircle className="mr-2 h-5 w-5" />
              Register New Device
          </Button>
        </Link>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">Device Status</CardTitle>
          <CardDescription className="font-body">
            Overview of all registered digital signage devices. "Unresponsive" means the device was online but hasn't sent a heartbeat recently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-12">
              <MonitorSmartphone className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="font-headline text-2xl">No Devices Registered</h3>
              <p className="font-body text-muted-foreground">
                Register a device to start displaying content.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px] font-headline">Status</TableHead>
                  <TableHead className="font-headline">Name</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Current Playlist</TableHead>
                  <TableHead className="font-headline hidden lg:table-cell">Last Seen</TableHead>
                  <TableHead className="text-right font-headline">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => {
                  const effectiveStatus = getDeviceEffectiveStatus(device);
                  return (
                  <TableRow key={device.id} className="font-body hover:bg-muted/50">
                    <TableCell>
                      <Badge 
                        variant={
                            effectiveStatus.status === 'online' ? 'default' : 
                            effectiveStatus.status === 'unresponsive' ? 'secondary' :
                            'destructive'} 
                        className="capitalize whitespace-nowrap"
                      >
                        {effectiveStatus.status === 'online' && <Wifi className="mr-1.5 h-3.5 w-3.5" />}
                        {effectiveStatus.status === 'offline' && <WifiOff className="mr-1.5 h-3.5 w-3.5" />}
                        {effectiveStatus.status === 'unresponsive' && <AlertCircle className="mr-1.5 h-3.5 w-3.5" />}
                        {effectiveStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-primary">{device.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {device.currentPlaylistId ? 
                        <Link href={`/admin/playlists/${device.currentPlaylistId}/edit`} className="hover:underline">{
                          playlistMap.get(device.currentPlaylistId) || device.currentPlaylistId
                        }</Link> 
                        : <span className="italic">Not assigned</span>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="mr-1.5 h-4 w-4" />
                        {formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-1" asChild>
                        <Link href={`/admin/devices/${device.id}/edit`}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit Device</span>
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!!isDeleting}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Device</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the device
                              "{device.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={!!isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteDevice(device.id, device.name)} disabled={!!isDeleting}>
                              {isDeleting === device.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
