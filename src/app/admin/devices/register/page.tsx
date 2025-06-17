
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DeviceRegistrationForm from "@/components/admin/DeviceRegistrationForm";

export default function RegisterDevicePage() {
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
          <h1 className="text-3xl font-headline font-semibold text-primary">Register New Device</h1>
          <p className="text-muted-foreground font-body">
            Enter the details for the new display device.
          </p>
        </div>
      </div>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline">Device Information</CardTitle>
          <CardDescription className="font-body">
            Provide a name for your new device. It will be initially set to 'online' status and can be assigned a playlist later from the devices list or device edit page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeviceRegistrationForm />
        </CardContent>
      </Card>
    </div>
  );
}
