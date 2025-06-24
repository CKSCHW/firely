
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js';
import { createCanvas, type Canvas } from 'canvas';

// Node.js canvas is not a full browser environment canvas, so we need a factory.
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return {
      canvas: canvas as unknown as HTMLCanvasElement, // Type hack to match pdfjs-dist expectations
      context,
    };
  }

  reset(canvasAndContext: { canvas: HTMLCanvasElement; context: any }, width: number, height: number) {
    (canvasAndContext.canvas as unknown as Canvas).width = width;
    (canvasAndContext.canvas as unknown as Canvas).height = height;
  }

  destroy(canvasAndContext: { canvas: HTMLCanvasElement; context: any }) {
    (canvasAndContext.canvas as unknown as Canvas).width = 0;
    (canvasAndContext.canvas as unknown as Canvas).height = 0;
  }
}

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true }).catch(e => {
    if (e.code !== 'EEXIST') throw e;
  });

  // Save the original file first
  const fileExtension = path.extname(file.name);
  const uniqueFilename = `${uuidv4()}${fileExtension}`;
  const filePath = path.join(uploadsDir, uniqueFilename);
  const fileUrl = `/uploads/${uniqueFilename}`;

  try {
    await writeFile(filePath, buffer);
  } catch (error) {
    console.error('Failed to save original file:', error);
    return NextResponse.json({ success: false, error: 'Failed to save original file.' }, { status: 500 });
  }

  // If it's not a PDF, we're done. Return the single URL.
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ success: true, url: fileUrl });
  }

  // --- PDF Processing Logic ---
  try {
    const pdfImageUrls: string[] = [];
    const loadingTask = getDocument({ data: new Uint8Array(bytes) });
    const pdf = await loadingTask.promise;
    const canvasFactory = new NodeCanvasFactory();

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Render at higher resolution
      const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
      const renderContext = {
        canvasContext: canvasAndContext.context,
        viewport: viewport,
        canvasFactory: canvasFactory,
      };

      await page.render(renderContext).promise;
      
      const imageBuffer = (canvasAndContext.canvas as unknown as Canvas).toBuffer('image/jpeg', { quality: 0.85 });
      const imageFilename = `${uuidv4()}.jpg`;
      const imagePath = path.join(uploadsDir, imageFilename);
      await writeFile(imagePath, imageBuffer);
      pdfImageUrls.push(`/uploads/${imageFilename}`);
      
      // Clean up to free memory
      page.cleanup();
      canvasFactory.destroy(canvasAndContext);
    }
    
    // Destroy the PDF document instance
    pdf.destroy();

    return NextResponse.json({ 
        success: true, 
        url: fileUrl, // original PDF url
        pageImageUrls: pdfImageUrls // array of converted image urls
    });

  } catch (error) {
    console.error('Failed to process PDF:', error);
    // Return the original PDF URL even if conversion fails, so it can be handled by client
    return NextResponse.json({ success: true, url: fileUrl, pageImageUrls: [], error: 'Failed to process PDF into images.' });
  }
}
