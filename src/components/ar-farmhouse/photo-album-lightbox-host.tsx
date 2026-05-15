"use client";

import { PhotoAlbumLightbox } from "@/components/ar-farmhouse/photo-album-lightbox";
import { usePhotoAlbum } from "@/contexts/photo-album-context";

/** Global lightbox mounted once under PhotoAlbumProvider. */
export function PhotoAlbumLightboxHost() {
  const { lightbox, closeLightbox } = usePhotoAlbum();
  return (
    <PhotoAlbumLightbox
      open={lightbox.open}
      items={lightbox.items}
      initialIndex={lightbox.index}
      onClose={closeLightbox}
    />
  );
}
