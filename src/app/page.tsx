
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tv, Settings, Zap } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [displayId, setDisplayId] = useState('');

  const handleLaunchDisplay = (e: FormEvent) => {
    e.preventDefault();
    if (displayId.trim()) {
      router.push(`/display/${displayId.trim()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4 sm:p-8 selection:bg-accent selection:text-accent-foreground">
      <header className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary rounded-full mb-6 shadow-lg">
          <Zap className="w-12 h-12 text-primary-foreground" />
        </div>
        <h1 className="text-5xl sm:text-6xl font-headline font-bold text-primary mb-3 tracking-tight">
          Firefly Signage
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
          Illuminate your spaces with dynamic content. Effortlessly manage and deploy stunning digital signage across all your displays.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-3xl w-full">
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-headline text-2xl text-primary">
              <Settings className="w-7 h-7 text-accent" />
              Admin Panel
            </CardTitle>
            <CardDescription className="font-body text-base">
              Manage playlists, monitor devices, and schedule your digital content with ease.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-body text-sm text-muted-foreground mb-4">
              Access the comprehensive suite of tools to control your signage network.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/admin/dashboard" asChild>
              <Button className="w-full font-headline text-lg py-6" variant="default">
                Go to Admin
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <form onSubmit={handleLaunchDisplay}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-headline text-2xl text-primary">
                <Tv className="w-7 h-7 text-accent" />
                Launch Display
              </CardTitle>
              <CardDescription className="font-body text-base">
                Enter a Display ID to launch its content client. (e.g., sample-display-1)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="displayIdInput" className="font-body text-sm text-muted-foreground mb-2 block">
                Display ID:
              </Label>
              <Input
                id="displayIdInput"
                type="text"
                value={displayId}
                onChange={(e) => setDisplayId(e.target.value)}
                placeholder="Enter Display ID (e.g., sample-display-1)"
                className="font-body"
                required
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full font-headline text-lg py-6" variant="outline" disabled={!displayId.trim()}>
                Launch Display Client
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <footer className="mt-16 text-center text-muted-foreground font-body text-sm">
        <p>&copy; {new Date().getFullYear()} Firefly Signage. Ignite Your Screens.</p>
        <p className="text-xs mt-1">
          Note: Device online/offline status in this prototype is based on mock data and not real-time.
        </p>
      </footer>
    </div>
  );
}
