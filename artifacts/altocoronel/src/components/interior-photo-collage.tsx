import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const PHOTOS = [
  {
    src: "interior-bano.jpg",
    alt: "Baño con tina, inodoro y mueble vanitorio",
    label: "Baño",
  },
  {
    src: "interior-dormitorio.jpg",
    alt: "Dormitorio con clóset empotrado",
    label: "Dormitorio",
  },
  {
    src: "interior-escritorio.jpg",
    alt: "Dormitorio con escritorio y clóset",
    label: "Dormitorio",
  },
  {
    src: "interior-ventana.jpg",
    alt: "Dormitorio con ventana termopanel",
    label: "Dormitorio",
  },
  {
    src: "interior-living.jpg",
    alt: "Living-comedor con escalera y acceso al patio",
    label: "Living-comedor",
  },
  {
    src: "interior-estar.jpg",
    alt: "Living-comedor con vista hacia la escalera",
    label: "Living-comedor",
  },
];

const layoutEase = [0.22, 1, 0.36, 1] as const;

export function InteriorPhotoCollage() {
  const reduceMotion = useReducedMotion();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setOffset((current) => (current + 1) % PHOTOS.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const orderedPhotos = PHOTOS.map((_, index) => PHOTOS[(index + offset) % PHOTOS.length]);

  return (
    <div
      className="aspect-[4/3] overflow-hidden rounded-sm bg-background md:aspect-[3/2]"
      role="region"
      aria-roledescription="collage animado"
      aria-label="Fotografías de interiores de AltoCoronel"
      aria-live="off"
      data-testid="interior-photo-collage"
    >
      <div className="grid h-full grid-cols-3 grid-rows-3 gap-1.5 p-1.5 md:gap-2 md:p-2">
        {orderedPhotos.map((photo, slot) => (
          <motion.figure
            key={photo.src}
            layout
            transition={{ layout: { duration: 1.1, ease: layoutEase } }}
            className={`group relative min-h-0 overflow-hidden rounded-sm bg-muted ${
              slot === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1"
            }`}
          >
            <img
              src={`${import.meta.env.BASE_URL}images/${photo.src}`}
              alt={photo.alt}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"
            />
            <figcaption className="absolute inset-x-0 bottom-0 px-2 pb-1.5 text-[10px] font-medium leading-tight text-white sm:px-3 sm:pb-2 sm:text-xs md:text-sm">
              {photo.label}
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  );
}