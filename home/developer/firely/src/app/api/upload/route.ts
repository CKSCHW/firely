
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
  // Ensure the upload directory exists
  await mkdir(uploadsDir, { recursive: true }).catch(e => {
    // Ignore error if directory already exists
    if (e.code !== 'EEXIST') {
      console.error('Failed to create upload directory:', e);
      throw e; // Throw for other errors
    }
  });

  const fileExtension = path.extname(file.name);
  const uniqueFilename = `${uuidv4()}${fileExtension}`;
  const filePath = path.join(uploadsDir, uniqueFilename);
  const fileUrl = `/uploads/${uniqueFilename}`;

  try {
    await writeFile(filePath, buffer);
    // Return a single URL for the uploaded file
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('Failed to save file:', error);
    return NextResponse.json({ success: false, error: 'Failed to save file.' }, { status: 500 });
  }
}
