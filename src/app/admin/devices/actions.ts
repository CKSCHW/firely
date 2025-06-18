
'use server';

import { z } from 'zod';
import { addMockDevice, updateMockDevice } from '@/data/mockData';
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
      currentPlaylistId: values.currentPlaylistId || undefined,
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
  deviceName: z.string().min(3, {
    message: "Device name must be at least 3 characters.",
  }),
});

export async function registerDeviceAction(values: z.infer<typeof registerDeviceFormSchema>) {
  try {
    await addMockDevice(values.deviceName);
  } catch (error) {
    console.error("Error registering device action:", error);
    return { success: false, message: error instanceof Error ? error.message : 'Registration failed due to an unexpected error.' };
  }

  revalidatePath('/admin/devices');
  redirect('/admin/devices');
}
