"use client";

import { useState, useEffect, useCallback } from "react";

const images = [
  { url: "https://images.unsplash.com/photo-1545361654-544f91660e2b?auto=format&fit=crop&w=1920&q=80", caption: "Kenton-on-Sea, Eastern Cape" },
  { url: "https://images.unsplash.com/photo-1753895985282-f3d013b83d5d?auto=format&fit=crop&w=1920&q=80", caption: "Kenton-on-Sea, Eastern Cape" },
  { url: "https://images.unsplash.com/photo-1752185191914-4611e19525c2?auto=format&fit=crop&w=1920&q=80", caption: "Kenton-on-Sea, Eastern Cape" },
  { url: "https://images.unsplash.com/photo-1682844924084-f613cf669e73?auto=format&fit=crop&w=1920&q=80", caption: "Northern Beaches, Sydney" },
  { url: "https://images.unsplash.com/photo-1689758920082-e8cf8a9d7185?auto=format&fit=crop&w=1920&q=80", caption: "Northern Beaches, Sydney" },
  { url: "https://images.unsplash.com/photo-1652763679543-820e1866c096?auto=format&fit=crop&w=1920&q=80", caption: "Northern Beaches, Sydney" },
  { url: "https://images.unsplash.com/photo-1741070487520-907d1359cb95?auto=format&fit=crop&w=1920&q=80", caption: "Northern Beaches, Sydney" },
  { url: "https://images.unsplash.com/photo-1744648617182-519c4bf39e30?auto=format&fit=crop&w=1920&q=80", caption: "Northern Beaches, Sydney" },
];

export function BackgroundSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const preloadImage = useCallback((index: number) => {
    if (loadedImages.has(index)) return;
    const img = new Image();
    img.src = images[index].url;
    img.onload = () => {
      setLoadedImages((prev) => new Set(prev).add(index));
    };
  }, [loadedImages]);

  useEffect(() => {
    preloadImage(currentIndex);
    preloadImage((currentIndex + 1) % images.length);
  }, [currentIndex, preloadImage]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-36 w-full overflow-hidden shrink-0">
      {images.map((image, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{
            backgroundImage: loadedImages.has(i) ? `url(${image.url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: i === currentIndex && loadedImages.has(i) ? 1 : 0,
          }}
        />
      ))}
      {/* Bottom fade into page background */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-950 to-transparent" />
      {/* Caption */}
      <div className="absolute bottom-5 right-4 text-[11px] text-white/50 font-mono tracking-wide">
        {images[currentIndex].caption}
      </div>
    </div>
  );
}
