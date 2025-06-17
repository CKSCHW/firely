import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Activity, BarChart3, ListChecks, Users, Zap } from "lucide-react";
import { mockDevices, mockPlaylists } from '@/data/mockData';

export default function DashboardPage() {
  const onlineDevices = mockDevices.filter(d => d.status === 'online').length;
  const totalDevices = mockDevices.length;
  const totalPlaylists = mockPlaylists.length;

  const quickStats = [
    { title: "Online Devices", value: `${onlineDevices} / ${totalDevices}`, icon: Zap, color: "text-green-500", description: "Currently active and connected." },
    { title: "Total Playlists", value: totalPlaylists, icon: ListChecks, color: "text-blue-500", description: "Available for scheduling." },
    { title: "Content Items", value: "125", icon: BarChart3, color: "text-orange-500", description: "Across all playlists." }, // Mocked value
    { title: "System Health", value: "Optimal", icon: Activity, color: "text-teal-500", description: "All systems operational." },
  ];

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
          <Link href="/admin/playlists/create" passHref legacyBehavior>
            <Button variant="default" className="w-full py-6 text-base font-headline">
              Create New Playlist
            </Button>
          </Link>
          <Link href="/admin/devices" passHref legacyBehavior>
            <Button variant="outline" className="w-full py-6 text-base font-headline">
              View All Devices
            </Button>
          </Link>
           <Link href="/admin/playlists" passHref legacyBehavior>
            <Button variant="secondary" className="w-full py-6 text-base font-headline">
              Manage Playlists
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
