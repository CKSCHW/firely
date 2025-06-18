
'use server';

import { z } from 'zod';
import { addMockDevice, updateMockDevice, updateMockDeviceHeartbeat } from '@/data/mockData';
import type { ScheduleEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const deviceFormSchema = z.object({
  deviceName: z.string().min(3, {
    message: "Device name must be at least 3 characters.",
  }),
  currentPlaylistId: z.string().optional(),
});
type DeviceFormValues = z.infer<typeof deviceFormSchema>;

export async function updateDeviceAction(
  deviceId: string,
  values: DeviceFormValues,
  schedule: ScheduleEntry[]
) {
  try {
    const result = await updateMockDevice(deviceId, {
      name: values.deviceName,
      currentPlaylistId: values.currentPlaylistId || undefined, // Ensure undefined if empty string
      schedule: schedule,
    });

    if (!result) {
      return { success: false, message: 'Device not found or update failed.' };
    }
  } catch (error) {
    console.error("Error updating device action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Update failed due to an unexpected error.' };
  }

  revalidatePath('/admin/devices');
  revalidatePath(`/admin/devices/${deviceId}/edit`);
  redirect('/admin/devices');
}

const registerDeviceFormSchema = z.object({
  deviceId: z.string().min(3, {
    message: "Device ID must be at least 3 characters.",
  }).regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Device ID can only contain letters, numbers, underscores, and hyphens."
  }),
  deviceName: z.string().min(3, {
    message: "Device name must be at least 3 characters.",
  }),
});

export async function registerDeviceAction(values: z.infer<typeof registerDeviceFormSchema>) {
  try {
    const result = await addMockDevice(values.deviceId, values.deviceName);
    if (result.success === false) {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error("Error registering device action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Registration failed due to an unexpected error.' };
  }

  revalidatePath('/admin/devices');
  redirect('/admin/devices');
}

export async function updateDeviceHeartbeatAction(deviceId: string) {
  if (!deviceId) {
    console.warn('updateDeviceHeartbeatAction called without deviceId');
    return { success: false, message: 'Device ID is required for heartbeat.' };
  }
  try {
    console.log(`Server Action: Received heartbeat for device ${deviceId}`);
    const result = await updateMockDeviceHeartbeat(deviceId);
    if (!result) {
      console.warn(`Server Action: Heartbeat update failed for device ${deviceId}, device not found or update error.`);
      return { success: false, message: 'Device not found or heartbeat update failed.' };
    }
    console.log(`Server Action: Heartbeat successful for device ${deviceId}`);
    // No revalidation needed here as it's a frequent, minor update primarily for status.
    // The devices page revalidates on its own load or via other actions.
    return { success: true };
  } catch (error) {
    console.error(`Server Action: Error processing heartbeat for device ${deviceId}:`, error);
    return { success: false, message: error instanceof Error ? error.message : 'Heartbeat processing failed.' };
  }
}
