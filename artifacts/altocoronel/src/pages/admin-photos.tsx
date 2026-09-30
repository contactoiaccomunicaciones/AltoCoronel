import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth, useClerk } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, Check, CircleAlert, ImagePlus, LockKeyhole, LogOut, RotateCcw, Trash2, UploadCloud, X } from 'lucide-react';
import {
  getGetHeroPhotosQueryKey,
  getGetHeroPhotoAdminAccessQueryKey,
  useCreateHeroPhoto,
  useDeleteHeroPhoto,
  useGetHeroPhotoAdminAccess,
  useGetHeroPhotos,
  useRequestHeroPhotoUpload,
} from '@workspace/api-client-react';
import type { Photo } from '@workspace/api-client-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const MAX_SIZE = 10 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const img = (name: string) => `${import.meta.env.BASE_URL}images/${name}`;
const photoUrl = (url: string) => url.startsWith('/api/') || /^https?:\/\//.test(url)
  ? url
  : `${import.meta.env.BASE_URL}${url.replace(/^\/+/, '')}`;

function readableError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'No pudimos completar la operación. Revisa tu conexión e inténtalo de nuevo.';
}

function DirectUpload(file: File, uploadURL: string, onProgress: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadURL);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`La transferencia de la imagen falló (código ${xhr.status}). Inténtalo de nuevo.`));
    };
    xhr.onerror = () => reject(new Error('No se pudo transferir la imagen. Revisa tu conexión e inténtalo de nuevo.'));
    xhr.onabort = () => reject(new Error('La transferencia fue interrumpida. Inténtalo de nuevo.'));
    xhr.send(file);
  });
}

function Header({ signOut }: { signOut: () => void }) {
  return (
    <header className="border-b border-[#20343b]/10 bg-[#f5f1e9]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-10 lg:px-16">
        <Link href="/" data-testid="link-admin-home-logo" className="flex items-center gap-4">
          <img src={img('miro-logo.png')} alt="Miró" className="h-9 w-auto max-w-28 object-contain" />
          <span className="hidden border-l border-[#20343b]/20 pl-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#20343b]/70 sm:block">AltoCoronel / Fotos</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" data-testid="link-admin-view-site" className="inline-flex items-center gap-2 text-xs font-semibold text-[#20343b] underline-offset-4 hover:underline">Ver sitio <ArrowRight className="h-3.5 w-3.5" /></Link>
          <button data-testid="button-admin-sign-out" type="button" onClick={signOut} className="inline-flex items-center gap-2 text-xs font-semibold text-[#a23543] underline-offset-4 hover:underline"><LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Cerrar sesión</span></button>
        </div>
      </div>
    </header>
  );
}

function StatusPanel({ title, message, kind, onRetry, signOut }: {
  title: string;
  message: string;
  kind: 'pending' | 'denied' | 'error';
  onRetry?: () => void;
  signOut: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start border border-[#20343b]/15 bg-[#f5f1e9] p-7 sm:p-12">
      <div className="mb-8 flex h-12 w-12 items-center justify-center bg-[#e7e3d9] text-[#a23543]">
        {kind === 'denied' ? <LockKeyhole className="h-6 w-6" /> : <CircleAlert className="h-6 w-6" />}
      </div>
      <span className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#a23543]">Administración de fotos</span>
      <h1 data-testid="text-admin-status-title" className="font-display text-3xl font-semibold leading-tight text-[#20343b] sm:text-4xl">{title}</h1>
      <p data-testid="text-admin-status-message" className="mt-5 max-w-lg text-sm leading-7 text-[#536169]">{message}</p>
      <div className="mt-9 flex flex-wrap gap-3">
        {onRetry && <button data-testid="button-admin-retry-access" type="button" onClick={onRetry} className="inline-flex items-center gap-2 bg-[#a23543] px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#f5f1e9] hover:bg-[#852b38]"><RotateCcw className="h-4 w-4" /> Reintentar</button>}
        <Link href="/" data-testid="link-admin-status-home" className="inline-flex items-center gap-2 border border-[#20343b]/25 px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] hover:bg-[#e7e3d9]"><ArrowLeft className="h-4 w-4" /> Volver al sitio</Link>
        <button data-testid="button-admin-status-sign-out" type="button" onClick={signOut} className="inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#a23543] hover:underline">Cerrar sesión</button>
      </div>
    </div>
  );
}

function PhotoCard({ photo, onDelete }: { photo: Photo; onDelete: (photo: Photo) => void }) {
  return (
    <article data-testid={`card-admin-photo-${photo.id}`} className="group overflow-hidden border border-[#20343b]/15 bg-[#f5f1e9]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#d4d4c8]">
        <img src={photoUrl(photo.url)} alt={photo.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
        <span className={`absolute left-3 top-3 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${photo.uploaded ? 'bg-[#d6e998] text-[#20343b]' : 'bg-[#20343b] text-[#f5f1e9]'}`}>{photo.uploaded ? 'Subida' : 'Original'}</span>
      </div>
      <div className="flex items-start justify-between gap-4 p-4">
        <div>
          <p data-testid={`text-photo-alt-${photo.id}`} className="text-sm font-medium leading-6 text-[#20343b]">{photo.alt}</p>
          <p className="mt-1 text-xs text-[#66747a]">{photo.uploaded ? 'Puedes eliminar esta fotografía.' : 'Imagen predeterminada · no se puede eliminar'}</p>
        </div>
        {photo.uploaded && <button data-testid={`button-delete-photo-${photo.id}`} type="button" onClick={() => onDelete(photo)} aria-label={`Eliminar ${photo.alt}`} title="Eliminar fotografía" className="shrink-0 border border-[#a23543]/25 p-2 text-[#a23543] transition-colors hover:bg-[#a23543] hover:text-[#f5f1e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a23543]"><Trash2 className="h-4 w-4" /></button>}
      </div>
    </article>
  );
}

function AdminWorkspace() {
  const client = useQueryClient();
  const photos = useGetHeroPhotos({ query: { queryKey: getGetHeroPhotosQueryKey(), staleTime: 0, refetchOnMount: 'always' } });
  const requestUpload = useRequestHeroPhotoUpload();
  const createPhoto = useCreateHeroPhoto();
  const deletePhoto = useDeleteHeroPhoto();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'idle' | 'request' | 'transfer' | 'finalize'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Photo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = stage !== 'idle';

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    setSuccess(null);
    if (!selected) return;
    if (!TYPES.includes(selected.type as typeof TYPES[number])) {
      setFile(null);
      setError('Elige una imagen JPEG, PNG o WEBP.');
      event.target.value = '';
      return;
    }
    if (selected.size > MAX_SIZE || selected.size === 0) {
      setFile(null);
      setError('La imagen debe pesar más de 0 bytes y hasta 10 MB.');
      event.target.value = '';
      return;
    }
    setFile(selected);
    setProgress(0);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setSuccess(null);
    if (!file) { setError('Selecciona una fotografía primero.'); return; }
    if (!alt.trim()) { setError('Escribe una descripción para la fotografía.'); return; }
    if (alt.trim().length > 500) { setError('La descripción no puede superar los 500 caracteres.'); return; }
    try {
      setStage('request');
      setProgress(0);
      const signed = await requestUpload.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type as typeof TYPES[number] } });
      setStage('transfer');
      await DirectUpload(file, signed.uploadURL, setProgress);
      setStage('finalize');
      await createPhoto.mutateAsync({ data: { uploadId: signed.uploadId, alt: alt.trim() } });
      await client.invalidateQueries({ queryKey: getGetHeroPhotosQueryKey() });
      setFile(null);
      setAlt('');
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
      setSuccess('Fotografía publicada. Ya aparece en el carrusel del sitio.');
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setStage('idle');
    }
  }

  async function confirmDelete() {
    if (!toDelete?.uploaded) return;
    const target = toDelete;
    setToDelete(null);
    setDeletingId(target.id);
    setError(null);
    setSuccess(null);
    try {
      await deletePhoto.mutateAsync({ id: target.id });
      await client.invalidateQueries({ queryKey: getGetHeroPhotosQueryKey() });
      setSuccess('Fotografía eliminada del carrusel.');
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="grid lg:grid-cols-[minmax(0,0.87fr)_minmax(0,1.13fr)]">
        <section className="bg-[#20343b] px-5 py-12 text-[#f5f1e9] sm:px-10 sm:py-16 lg:min-h-[calc(100dvh-74px)] lg:px-14">
          <div className="mx-auto max-w-xl">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#d6e998]">01 / Gestión visual</p>
            <h1 className="font-display max-w-lg text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[clamp(3rem,4vw,5rem)]">Las imágenes cuentan la historia.</h1>
            <p className="mb-10 mt-6 max-w-md text-sm leading-7 text-[#f5f1e9]/70">Actualiza las fotografías del carrusel de AltoCoronel. Las imágenes originales permanecen protegidas.</p>
            <form onSubmit={submit} className="border-t border-[#f5f1e9]/25 pt-8">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label htmlFor="hero-photo-file" className="text-xs font-semibold uppercase tracking-[0.12em]">Nueva fotografía</label>
                <span className="text-xs text-[#f5f1e9]/55">JPEG, PNG o WEBP · máx. 10 MB</span>
              </div>
              <input ref={inputRef} id="hero-photo-file" data-testid="input-admin-photo-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} disabled={busy} className="sr-only" />
              <label htmlFor="hero-photo-file" className={`flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden border border-dashed border-[#d6e998]/55 bg-[#f5f1e9]/5 text-center transition-colors hover:bg-[#f5f1e9]/10 focus-within:outline-2 focus-within:outline-[#d6e998] ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                {preview ? (
                  <div className="relative h-60 w-full">
                    <img src={preview} alt="Vista previa de la fotografía seleccionada" className="h-full w-full object-contain" />
                    <span className="absolute bottom-3 left-3 bg-[#20343b]/90 px-3 py-2 text-xs text-[#f5f1e9]">Cambiar fotografía</span>
                  </div>
                ) : (
                  <div className="px-5 py-8">
                    <ImagePlus className="mx-auto mb-4 h-8 w-8 text-[#d6e998]" strokeWidth={1.5} />
                    <span className="block text-sm font-medium">Seleccionar una imagen</span>
                    <span className="mt-2 block text-xs text-[#f5f1e9]/55">Verás una vista previa antes de publicarla.</span>
                  </div>
                )}
              </label>
              {file && <p data-testid="text-admin-selected-file" className="mt-2 flex items-center justify-between gap-3 text-xs text-[#f5f1e9]/70"><span className="truncate">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" data-testid="button-admin-clear-file" disabled={busy} onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }} aria-label="Quitar fotografía seleccionada" className="shrink-0 hover:text-[#d6e998]"><X className="h-4 w-4" /></button></p>}
              <label htmlFor="hero-photo-alt" className="mb-2 mt-7 block text-xs font-semibold uppercase tracking-[0.12em]">Descripción de la imagen <span className="text-[#d6e998]">*</span></label>
              <textarea id="hero-photo-alt" data-testid="input-admin-photo-alt" value={alt} onChange={(event) => setAlt(event.target.value)} maxLength={500} disabled={busy} required rows={3} placeholder="Ej.: Fachada de las casas de AltoCoronel al atardecer" className="w-full resize-y border border-[#f5f1e9]/30 bg-[#f5f1e9]/5 p-4 text-sm leading-6 text-[#f5f1e9] outline-none placeholder:text-[#f5f1e9]/40 focus:border-[#d6e998]" />
              <p className="mt-1 text-right text-xs text-[#f5f1e9]/50">{alt.length}/500</p>
              {busy && <div aria-live="polite" data-testid="status-admin-upload" className="mt-5"><div className="flex justify-between gap-2 text-xs text-[#d6e998]"><span>{stage === 'request' ? 'Preparando carga…' : stage === 'transfer' ? 'Subiendo imagen…' : 'Publicando fotografía…'}</span><span>{stage === 'transfer' ? `${progress}%` : ''}</span></div><div role="progressbar" aria-label="Progreso de carga" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stage === 'finalize' ? 100 : progress} className="mt-2 h-1 bg-[#f5f1e9]/15"><div className="h-full bg-[#d6e998] transition-[width] duration-200" style={{ width: stage === 'request' ? '8%' : stage === 'finalize' ? '100%' : `${progress}%` }} /></div></div>}
              {error && <div role="alert" data-testid="status-admin-error" className="mt-5 border-l-2 border-[#e7b2a7] bg-[#e7b2a7]/10 px-4 py-3 text-sm leading-6 text-[#f6d6cc]">{error}</div>}
              {success && <div role="status" data-testid="status-admin-success" className="mt-5 flex items-start gap-2 border-l-2 border-[#d6e998] bg-[#d6e998]/10 px-4 py-3 text-sm leading-6 text-[#e0eeb9]"><Check className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}
              <button data-testid="button-admin-upload-photo" type="submit" disabled={busy || !file || !alt.trim()} className="mt-7 inline-flex w-full items-center justify-center gap-3 bg-[#d6e998] px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-[#20343b] transition-colors hover:bg-[#e6f5b8] disabled:cursor-not-allowed disabled:opacity-45"><UploadCloud className="h-4 w-4" />{busy ? 'Publicando…' : 'Subir foto'}</button>
            </form>
          </div>
        </section>
        <section className="bg-[#e7e3d9] px-5 py-12 sm:px-10 sm:py-16 lg:px-14">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a23543]">02 / Carrusel actual</p><h2 className="font-display text-3xl font-semibold tracking-tight text-[#20343b] sm:text-4xl">Fotos publicadas<span className="text-[#a23543]">.</span></h2></div>
              {photos.data && <span data-testid="text-admin-photo-count" className="text-xs font-semibold uppercase tracking-[0.15em] text-[#536169]">{photos.data.photos.length} imágenes</span>}
            </div>
            {photos.isLoading ? <div aria-label="Cargando fotos" className="grid gap-5 sm:grid-cols-2">{[0, 1, 2, 3].map((n) => <div key={n} className="animate-pulse border border-[#20343b]/10 bg-[#f5f1e9]"><div className="aspect-[16/10] bg-[#d4d4c8]" /><div className="m-4 h-4 w-2/3 bg-[#d4d4c8]" /></div>)}</div> : photos.isError ? <div role="alert" className="border border-[#a23543]/25 bg-[#f5f1e9] p-7"><CircleAlert className="mb-4 text-[#a23543]" /><p className="text-sm leading-6">No pudimos cargar las fotografías. {readableError(photos.error)}</p><button data-testid="button-admin-retry-photos" type="button" onClick={() => photos.refetch()} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#a23543] underline"><RotateCcw className="h-4 w-4" /> Reintentar</button></div> : !photos.data?.photos.length ? <div className="border border-dashed border-[#20343b]/25 bg-[#f5f1e9] px-8 py-14 text-center"><ImagePlus className="mx-auto mb-4 h-8 w-8 text-[#a23543]" /><h3 className="font-display text-xl font-semibold">Aún no hay fotografías</h3><p className="mt-2 text-sm text-[#536169]">Sube una imagen para empezar el carrusel.</p></div> : <div className="grid gap-5 sm:grid-cols-2">{photos.data.photos.map((photo) => <PhotoCard key={photo.id} photo={photo} onDelete={setToDelete} />)}</div>}
            {deletingId && <p role="status" data-testid="status-admin-deleting" className="mt-4 text-sm text-[#536169]">Eliminando fotografía…</p>}
            <p className="mt-8 border-t border-[#20343b]/15 pt-5 text-xs leading-6 text-[#66747a]">Las fotografías originales del proyecto son permanentes. Solo puedes eliminar las que hayas subido aquí.</p>
          </div>
        </section>
      </div>
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent className="border-[#c5bbae] bg-[#f5f1e9] text-[#20343b]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">¿Eliminar esta fotografía?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6 text-[#536169]">“{toDelete?.alt}” desaparecerá del carrusel público. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-admin-cancel-delete" className="border-[#c5bbae] bg-transparent">Cancelar</AlertDialogCancel>
            <AlertDialogAction data-testid="button-admin-confirm-delete" onClick={confirmDelete} className="bg-[#a23543] text-[#f5f1e9] hover:bg-[#852b38]">Sí, eliminar foto</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AdminPhotos() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { signOut } = useClerk();
  const access = useGetHeroPhotoAdminAccess({ query: { queryKey: [...getGetHeroPhotoAdminAccessQueryKey(), userId], enabled: isLoaded && !!isSignedIn, staleTime: 0, refetchOnMount: 'always' } });
  const handleSignOut = () => { void signOut({ redirectUrl: import.meta.env.BASE_URL }); };

  if (!isLoaded) return <main className="min-h-[100dvh] bg-[#e7e3d9]"><div className="mx-auto max-w-5xl space-y-7 px-5 py-20"><div className="h-9 w-48 animate-pulse bg-[#d4d4c8]" /><div className="h-20 w-2/3 animate-pulse bg-[#d4d4c8]" /><div className="h-72 animate-pulse bg-[#d4d4c8]" /></div></main>;
  if (!isSignedIn) return (
    <main className="flex min-h-[100dvh] flex-col bg-[#e7e3d9]">
      <header className="px-5 py-6 sm:px-10"><Link href="/" data-testid="link-admin-public-home" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#20343b] hover:underline"><ArrowLeft className="h-4 w-4" /> Volver al sitio</Link></header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 py-10 sm:px-10 lg:grid-cols-2">
        <div><p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-[#a23543]">AltoCoronel / Administración</p><h1 className="font-display max-w-lg text-5xl font-semibold leading-[1.05] tracking-tight text-[#20343b] sm:text-6xl">Tu espacio para cuidar el sitio.</h1><p className="mt-7 max-w-md text-sm leading-7 text-[#536169]">Inicia sesión para gestionar las fotografías del carrusel. El acceso se confirma de forma segura antes de mostrar cualquier herramienta.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/sign-in" data-testid="link-admin-sign-in" className="inline-flex items-center gap-2 bg-[#a23543] px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#f5f1e9] hover:bg-[#852b38]">Iniciar sesión <ArrowRight className="h-4 w-4" /></Link><Link href="/sign-up" data-testid="link-admin-sign-up" className="inline-flex items-center gap-2 border border-[#20343b]/30 px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#20343b] hover:bg-[#f5f1e9]">Crear cuenta</Link></div></div>
        <div className="relative aspect-[4/5] max-h-[650px] overflow-hidden bg-[#20343b]"><img src={img('hero-casa-esquina.jpg')} alt="Vista del proyecto AltoCoronel" className="h-full w-full object-cover" /><div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#20343b]/90 to-transparent p-7 text-xs font-semibold uppercase tracking-[0.2em] text-[#f5f1e9]">Miró · Coronel, Chile</div></div>
      </div>
    </main>
  );

  return (
    <main className="min-h-[100dvh] bg-[#e7e3d9] text-[#20343b]">
      <Header signOut={handleSignOut} />
      {access.isPending || access.isFetching ? <div className="mx-auto max-w-5xl space-y-7 px-5 py-20"><div className="h-9 w-48 animate-pulse bg-[#d4d4c8]" /><div className="h-20 w-2/3 animate-pulse bg-[#d4d4c8]" /><div className="h-72 animate-pulse bg-[#d4d4c8]" /></div>
        : access.isError ? <div className="px-5 py-16"><StatusPanel kind="error" title="No pudimos verificar el acceso." message="No mostramos controles de edición hasta confirmar tus permisos con el servidor. Revisa la conexión y vuelve a intentarlo." onRetry={() => { void access.refetch(); }} signOut={handleSignOut} /></div>
          : !access.data?.configured ? <div className="px-5 py-16"><StatusPanel kind="pending" title="Configuración pendiente." message="Aún no se ha configurado el correo del administrador. Las fotografías no se pueden modificar hasta que se complete esta configuración en el servidor." signOut={handleSignOut} /></div>
            : !access.data.signedIn || !access.data.isAdmin ? <div className="px-5 py-16"><StatusPanel kind="denied" title="No tienes permiso para gestionar fotos." message="Esta cuenta no está autorizada para editar el carrusel de AltoCoronel. Puedes volver al sitio público o cerrar sesión e ingresar con la cuenta administradora." signOut={handleSignOut} /></div>
              : <AdminWorkspace />}
    </main>
  );
}