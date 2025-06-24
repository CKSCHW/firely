
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, FileWarning } from 'lucide-react';

interface PdfAsImagesSlideshowProps {
  pageImageUrls?: string[];
  duration: number; // Total duration for the whole PDF
  onError: () => void;
}

export default function PdfViewer({ pageImageUrls, duration, onError }: PdfAsImagesSlideshowProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const numPages = pageImageUrls?.length || 0;

  // This effect handles cycling through the pages
  useEffect(() => {
    if (numPages <= 1) return;

    // Calculate duration per page, with a minimum of 1 second
    const pageDuration = Math.max(1000, (duration * 1000) / numPages);

    const interval = setInterval(() => {
      setCurrentPageIndex((prevIndex) => (prevIndex + 1) % numPages);
    }, pageDuration);

    return () => clearInterval(interval);
  }, [duration, numPages]);

  if (!pageImageUrls || numPages === 0) {
    // This can happen if the PDF failed to convert or for old data
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 text-red-600 p-4 text-center">
        <FileWarning className="w-16 h-16 mb-4" />
        <p className="text-xl font-semibold">Could not display PDF</p>
        <p className="text-md max-w-xl break-words">
          The pages for this PDF are not available as images. Please re-upload the PDF.
        </p>
      </div>
    );
  }
  
  const currentImageSrc = pageImageUrls[currentPageIndex];

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white">
      {currentImageSrc ? (
         <Image
            key={currentPageIndex}
            src={currentImageSrc}
            alt={`PDF Page ${currentPageIndex + 1} of ${numPages}`}
            fill={true}
            style={{ objectFit: "contain" }}
            quality={90}
            priority
            className="animate-fadeIn"
            unoptimized // Uploaded images are not optimized by Next.js image optimizer
            onError={onError} // Use the parent error handler for image load errors
          />
      ) : (
        // This case would be rare but could happen in some race conditions
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-700 p-4 text-center">
          <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
          <p>Loading page {currentPageIndex + 1}...</p>
        </div>
      )}
    </div>
  );
}
