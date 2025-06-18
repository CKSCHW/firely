
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, MonitorSmartphone, Loader2 } from "lucide-react";
import DeviceEditForm from "@/components/admin/DeviceEditForm";
import { mockDevices, ensureDataLoaded } from "@/data/mockData";
import { useEffect, useState } from "react";
import type { DisplayDevice } from "@/lib/types";
import { useParams } from 'next/navigation';

export default function EditDevicePage() {
  const paramsHook = useParams<{ deviceId: string }>();
  const deviceId = paramsHook.deviceId;

  const [device, setDevice] = useState<DisplayDevice | undefined | null>(undefined); // undefined: loading, null: not found
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDevice() {
      setIsLoading(true);
      await ensureDataLoaded();
      const foundDevice = mockDevices.find(d => d.id === deviceId);
      setDevice(foundDevice || null);
      setIsLoading(false);
    }
    if (deviceId) {
      loadDevice();
    }
  }, [deviceId]);

  if (isLoading || device === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (device === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/devices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-headline font-semibold text-destructive">Device Not Found</h1>
        </div>
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <p className="font-body text-center text-muted-foreground">
              The device you are trying to edit does not exist or could not be loaded.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild>
                <Link href="/admin/devices">Back to Devices</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deviceName = device.name;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/devices">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Devices</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <MonitorSmartphone className="mr-3 h-8 w-8" /> Edit {deviceName}
          </h1>
          <p className="text-muted-foreground font-body">
            Update the details and assign a playlist for this device.
          </p>
        </div>
      </div>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">Device Configuration</CardTitle>
          <CardDescription className="font-body">
            Modify the device name and select a playlist. Device status and last seen are updated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeviceEditForm deviceId={deviceId} />
        </CardContent>
      </Card>
    </div>
  );
}
