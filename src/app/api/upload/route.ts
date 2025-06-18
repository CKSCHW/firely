
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  
  try {
    await mkdir(uploadsDir, { recursive: true });
  } catch (e: any) {
    if (e.code !== 'EEXIST') {
      console.error('Failed to create upload directory:', e);
      return NextResponse.json({ success: false, error: 'Failed to create upload directory.' }, { status: 500 });
    }
  }
  
  const fileExtension = path.extname(file.name);
  const uniqueFilename = `${uuidv4()}${fileExtension}`;
  const filePath = path.join(uploadsDir, uniqueFilename);

  try {
    await writeFile(filePath, buffer);
    const fileUrl = `/uploads/${uniqueFilename}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('Failed to save file:', error);
    return NextResponse.json({ success: false, error: 'Failed to save file.' }, { status: 500 });
  }
}
