
'use server';

import { z } from 'zod';
import { addMockDevice, updateMockDevice, updateMockDeviceHeartbeat } from '@/data/mockData';
import type { ScheduleEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deleteField } from 'firebase/firestore'; // Ensure this is imported if used in updateMockDevice

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
    const updatePayload: any = {
      name: values.deviceName,
      schedule: schedule,
    };

    if (values.currentPlaylistId === undefined || values.currentPlaylistId === null || values.currentPlaylistId === "__NO_PLAYLIST__") {
      updatePayload.currentPlaylistId = deleteField(); // Special marker for deletion
    } else {
      updatePayload.currentPlaylistId = values.currentPlaylistId;
    }
    
    const result = await updateMockDevice(deviceId, updatePayload);

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
    // addMockDevice now throws on critical DB error, or returns {success: false, message} for logical errors
    const result = await addMockDevice(values.deviceId, values.deviceName);

    if (!result.success) { // Handles logical errors like "ID already exists"
      return { success: false, message: result.message };
    }
    // If result.success is true, proceed to revalidate and redirect
    
  } catch (error) {
    // Catches errors thrown by addMockDevice (e.g., Firestore errors) or other unexpected errors
    console.error("Error in registerDeviceAction catch block:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Registration failed due to an unexpected server error.' };
  }

  // Only reached if addMockDevice was successful and didn't throw or return {success: false}
  revalidatePath('/admin/devices');
  redirect('/admin/devices');
}

export async function updateDeviceHeartbeatAction(deviceId: string) {
  if (!deviceId) {
    console.warn('updateDeviceHeartbeatAction called without deviceId');
    return { success: false, message: 'Device ID is required for heartbeat.' };
  }
  try {
    const result = await updateMockDeviceHeartbeat(deviceId);
    if (!result) {
      return { success: false, message: 'Device not found or heartbeat update failed.' };
    }
    return { success: true };
  } catch (error) {
    console.error(`Server Action: Error processing heartbeat for device ${deviceId}:`, error);
    return { success: false, message: error instanceof Error ? error.message : 'Heartbeat processing failed.' };
  }
}
