
"use client";
import { mockDevices, ensureDataLoaded } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MonitorSmartphone, Wifi, WifiOff, Clock, Edit, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import type { DisplayDevice } from '@/lib/types';

export default function DevicesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<DisplayDevice[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await ensureDataLoaded();
      setDevices([...mockDevices]);
      setIsLoading(false);
    }
    loadData();
  }, []);

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
            Monitor and manage your connected display devices.
          </p>
        </div>
        <Link href="/admin/devices/register" passHref legacyBehavior>
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
            Overview of all registered digital signage devices.
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
                  <TableHead className="w-[100px] font-headline">Status</TableHead>
                  <TableHead className="font-headline">Name</TableHead>
                  <TableHead className="font-headline hidden md:table-cell">Current Playlist</TableHead>
                  <TableHead className="font-headline hidden lg:table-cell">Last Seen</TableHead>
                  <TableHead className="text-right font-headline">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id} className="font-body hover:bg-muted/50">
                    <TableCell>
                      <Badge variant={device.status === 'online' ? 'default' : 'destructive'} className="capitalize whitespace-nowrap">
                        {device.status === 'online' ? <Wifi className="mr-1.5 h-3.5 w-3.5" /> : <WifiOff className="mr-1.5 h-3.5 w-3.5" />}
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-primary">{device.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {device.currentPlaylistId ? 
                        <Link href={`/admin/playlists/${device.currentPlaylistId}/edit`} className="hover:underline">{
                          mockPlaylists.find(p=>p.id === device.currentPlaylistId)?.name || device.currentPlaylistId
                        }</Link> 
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="mr-1.5 h-4 w-4" />
                        {formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-1" disabled>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Device</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Device</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
