
'use server';

import { z } from 'zod';
import { addDevice, updateDevice, updateDeviceHeartbeat, deleteDevice } from '@/data/mockData';
import type { ScheduleEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deleteField } from 'firebase/firestore'; 

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
      // The data layer will handle the deleteField() translation
      updatePayload.currentPlaylistId = "__NO_PLAYLIST__";
    } else {
      updatePayload.currentPlaylistId = values.currentPlaylistId;
    }
    
    const result = await updateDevice(deviceId, updatePayload);

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
    const result = await addDevice(values.deviceId, values.deviceName);

    if (!result.success) { 
      return { success: false, message: result.message };
    }
    
  } catch (error) {
    console.error("Error in registerDeviceAction catch block:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Registration failed due to an unexpected server error.' };
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
    await updateDeviceHeartbeat(deviceId); 
    return { success: true }; 
  } catch (error) {
    console.error(`Server Action: Error processing heartbeat for device ${deviceId}:`, error);
    return { success: false, message: error instanceof Error ? error.message : 'Heartbeat processing failed.' };
  }
}

export async function deleteDeviceAction(deviceId: string) {
  try {
    await deleteDevice(deviceId);
  } catch (error) {
    console.error("Error deleting device action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'An unexpected error occurred during device deletion.' };
  }

  revalidatePath('/admin/devices');
  return { success: true };
}
