
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Activity, ListChecks, Users, Zap, LibraryBig, Loader2 } from "lucide-react";
import { mockDevices, mockPlaylists, availableContentItems, ensureDataLoaded } from '@/data/mockData';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [onlineDevices, setOnlineDevices] = useState(0);
  const [totalDevices, setTotalDevices] = useState(0);
  const [totalPlaylists, setTotalPlaylists] = useState(0);
  const [totalContentItems, setTotalContentItems] = useState(0);
  
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await ensureDataLoaded();
      setOnlineDevices(mockDevices.filter(d => d.status === 'online').length);
      setTotalDevices(mockDevices.length);
      setTotalPlaylists(mockPlaylists.length);
      setTotalContentItems(availableContentItems.length);
      setIsLoading(false);
    }
    loadData();
  }, []);


  const quickStats = [
    { title: "Online Devices", value: `${onlineDevices} / ${totalDevices}`, icon: Zap, color: "text-green-500", description: "Currently active and connected." },
    { title: "Total Playlists", value: totalPlaylists, icon: ListChecks, color: "text-blue-500", description: "Available for scheduling." },
    { title: "Content Items", value: totalContentItems, icon: LibraryBig, color: "text-orange-500", description: "In your media library." },
    { title: "System Health", value: "Optimal", icon: Activity, color: "text-teal-500", description: "All systems operational." },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary">Welcome to Firefly Admin</CardTitle>
          <CardDescription className="font-body text-lg">
            Here's a quick overview of your digital signage network.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-body text-muted-foreground">
            Manage your content, monitor device statuses, and ensure your displays are always shining bright.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map(stat => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-body">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold font-headline ${stat.color}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground font-body pt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link href="/admin/playlists/create" asChild>
            <Button variant="default" className="w-full py-6 text-base font-headline">
              Create New Playlist
            </Button>
          </Link>
          <Link href="/admin/content/create" asChild>
            <Button variant="default" className="w-full py-6 text-base font-headline">
              Add New Content
            </Button>
          </Link>
           <Link href="/admin/devices/register" asChild>
            <Button variant="default" className="w-full py-6 text-base font-headline">
              Register New Device
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
