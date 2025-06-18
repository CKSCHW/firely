import Link from 'next/link';
import Image from 'next/image';
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, LayoutDashboard, ListMusic, LogOut, MonitorSmartphone, Settings, ShieldQuestion, LibraryBig } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/toaster'; 

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
};

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/playlists', label: 'Playlists', icon: ListMusic },
  { href: '/admin/devices', label: 'Geräte', icon: MonitorSmartphone },
  { href: '/admin/content', label: 'Inhaltsbibliothek', icon: LibraryBig },
];

const secondaryNavItems: NavItem[] = [
    { href: '#', label: 'Einstellungen', icon: Settings }, 
    { href: '#', label: 'Hilfe & Support', icon: ShieldQuestion }, 
];


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" side="left" variant="sidebar">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <Link href="/admin/dashboard" className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-sm">
            <div className="w-8 h-8 relative">
              <Image src="/logo.png" alt="Schwarzmann Screen Logo" fill style={{objectFit: "contain"}} data-ai-hint="company logo" />
            </div>
            <h2 className="text-xl font-headline font-bold text-primary group-data-[collapsible=icon]:hidden">
              Schwarzmann Screen
            </h2>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <SidebarMenu className="px-2 py-4">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href} asChild>
                  <SidebarMenuButton
                    variant="default"
                    size="default"
                    tooltip={{ children: item.label, side: 'right', align: 'center' }}
                    className="font-body"
                  >
                    <item.icon className="group-data-[collapsible=icon]:text-primary" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto group-data-[collapsible=icon]:hidden">
                        {item.badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          
          <SidebarMenu className="px-2 py-4 mt-auto border-t border-sidebar-border">
             {secondaryNavItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href} asChild>
                  <SidebarMenuButton
                    variant="ghost"
                    size="default"
                    tooltip={{ children: item.label, side: 'right', align: 'center' }}
                     className="font-body text-sidebar-foreground/80 hover:text-sidebar-foreground"
                  >
                    <item.icon />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

        </SidebarContent>
        <SidebarFooter className="p-3 border-t border-sidebar-border">
           <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-9 w-9">
                <AvatarImage src="https://placehold.co/100x100/3F51B5/FFFFFF.png?text=AU" alt="Admin User" data-ai-hint="user avatar"/>
                <AvatarFallback>AU</AvatarFallback>
              </Avatar>
              <div className="group-data-[collapsible=icon]:hidden font-body">
                <p className="text-sm font-medium text-sidebar-foreground">Admin User</p>
                <p className="text-xs text-sidebar-foreground/70">admin@schwarzmann-screen.de</p>
              </div>
           </div>
           <Button variant="ghost" className="w-full justify-start mt-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 font-body text-sidebar-foreground/80 hover:text-sidebar-foreground">
             <LogOut className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
             <span className="group-data-[collapsible=icon]:hidden">Abmelden</span>
           </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
          <SidebarTrigger className="md:hidden" /> 
          <div className="flex-1">
            <h1 className="text-lg font-headline font-semibold text-primary">Admin Portal</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Benachrichtigungen</span>
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6 bg-secondary/50 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
