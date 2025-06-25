
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, FileWarning } from 'lucide-react';

interface PdfViewerProps {
  pageImageUrls?: string[];
  duration: number; // Duration per page in seconds
  onError: () => void;
}

export default function PdfViewer({ pageImageUrls, duration, onError }: PdfViewerProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const numPages = pageImageUrls?.length || 0;
  // The duration prop is now correctly used as the time for each page.
  const pageDuration = Math.max(1000, duration * 1000);

  // Preload images
  useEffect(() => {
    if (pageImageUrls) {
      pageImageUrls.forEach(src => {
        const img = new (window as any).Image();
        img.src = src;
        img.onload = () => {
          setLoadedImages(prev => ({ ...prev, [src]: true }));
        };
      });
    }
  }, [pageImageUrls]);

  // Slideshow logic
  useEffect(() => {
    if (numPages <= 1) return;

    const interval = setInterval(() => {
      setCurrentPageIndex(prevIndex => (prevIndex + 1) % numPages);
    }, pageDuration);

    return () => clearInterval(interval);
  }, [numPages, pageDuration]);

  if (!pageImageUrls || numPages === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 text-red-600 p-4 text-center">
        <FileWarning className="w-16 h-16 mb-4" />
        <p className="text-xl font-semibold">PDF Not Processed Correctly</p>
        <p className="text-md max-w-xl">The pages for this PDF are not available. Please re-upload it in the admin panel.</p>
      </div>
    );
  }
  
  const currentImageSrc = pageImageUrls[currentPageIndex];

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white">
      {!loadedImages[currentImageSrc] ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-700">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="mt-4">Loading page {currentPageIndex + 1}...</p>
        </div>
      ) : (
         <Image
            key={currentImageSrc} // Key change triggers animation
            src={currentImageSrc}
            alt={`PDF Page ${currentPageIndex + 1} of ${numPages}`}
            fill={true}
            style={{ objectFit: "contain" }}
            quality={90}
            priority
            className="animate-fadeIn"
            unoptimized // Uploaded images from PDF are not optimized
            onError={onError}
          />
      )}
    </div>
  );
}
