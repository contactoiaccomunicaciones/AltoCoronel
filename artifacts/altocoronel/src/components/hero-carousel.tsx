import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type MotionStyle } from "framer-motion";
import { getGetHeroPhotosQueryKey, useGetHeroPhotos } from "@workspace/api-client-react";

const INITIAL_PHOTOS = [
  { id: "original", url: "images/hero-alto-coronel.jpg", alt: "Viviendas de AltoCoronel en Coronel", uploaded: false },
  { id: "casa-esquina", url: "images/hero-casa-esquina.jpg", alt: "Vista en esquina de una vivienda de AltoCoronel", uploaded: false },
  { id: "casa-frente", url: "images/hero-casa-frente.jpg", alt: "Frente de una vivienda de AltoCoronel", uploaded: false },
];

function photoUrl(url: string) {
  return url.startsWith("/") ? url : `${import.meta.env.BASE_URL}${url}`;
}

export function HeroCarousel({ style }: { style: MotionStyle }) {
  const reducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState("original");
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [reloadedUrls, setReloadedUrls] = useState<Record<string, string>>({});
  const query = useGetHeroPhotos({
    query: {
      queryKey: getGetHeroPhotosQueryKey(),
      placeholderData: { photos: INITIAL_PHOTOS },
      staleTime: 15_000,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  });
  const sourcePhotos = query.data?.photos ?? INITIAL_PHOTOS;
  const photos = useMemo(
    () => sourcePhotos.filter((photo) => !failedIds.includes(photo.id)),
    [sourcePhotos, failedIds],
  );
  const foundIndex = photos.findIndex((photo) => photo.id === activeId);
  const index = foundIndex < 0 ? 0 : foundIndex;
  const active = photos[index];

  useEffect(() => {
    if (!failedIds.length) return;
    const pending = new Map<string, HTMLImageElement>();
    const timer = window.setInterval(() => {
      for (const id of failedIds) {
        const photo = sourcePhotos.find((candidate) => candidate.id === id);
        if (!photo || pending.has(id)) continue;
        const url = photoUrl(photo.url);
        const retryUrl = `${url}${url.includes("?") ? "&" : "?"}image_retry=${Date.now()}`;
        const image = new Image();
        pending.set(id, image);
        image.onload = () => {
          pending.delete(id);
          setReloadedUrls((previous) => ({ ...previous, [id]: retryUrl }));
          setFailedIds((previous) => previous.filter((failedId) => failedId !== id));
        };
        image.onerror = () => pending.delete(id);
        image.src = retryUrl;
      }
    }, 10_000);
    return () => {
      window.clearInterval(timer);
      for (const image of pending.values()) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [failedIds, sourcePhotos]);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = window.setTimeout(() => {
      setActiveId(photos[(index + 1) % photos.length].id);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [index, photos]);

  useEffect(() => {
    if (photos.length < 2) return;
    const nextImage = new Image();
    const next = photos[(index + 1) % photos.length];
    nextImage.src = reloadedUrls[next.id] ?? photoUrl(next.url);
  }, [index, photos, reloadedUrls]);

  return (
    <>
      <motion.div style={style} className="pointer-events-none absolute inset-0" aria-live="off"
        role="region" aria-roledescription="carrusel" aria-label="Fotografías de AltoCoronel">
        <AnimatePresence initial={false}>
          {active && (
            <motion.div key={active.id} className="absolute inset-0"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 1.1 }}>
              <img src={reloadedUrls[active.id] ?? photoUrl(active.url)} alt={active.alt}
                onError={() => setFailedIds((previous) => previous.includes(active.id) ? previous : [...previous, active.id])}
                className={`absolute inset-0 h-full w-full object-cover ${active.id === "original" ? "object-top" : "object-[center_35%]"}`}
                data-testid="img-hero" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {(query.isError || failedIds.length > 0) && (
        <div className="absolute right-5 top-24 z-20 md:right-10 md:top-28">
          <p role="status" className="mt-2 max-w-60 rounded-sm bg-black/65 px-3 py-2 text-xs text-white">
            {query.isError ? "No pudimos cargar las fotos adicionales." : "Reintentando cargar una de las fotos…"}
          </p>
        </div>
      )}
    </>
  );
}