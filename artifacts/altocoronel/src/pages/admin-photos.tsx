import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, LockKeyhole, Trash2, UploadCloud } from 'lucide-react';
import {
  getGetHeroPhotoAdminAccessQueryKey,
  getGetHeroPhotosQueryKey,
  useCreateHeroPhoto,
  useDeleteHeroPhoto,
  useGetHeroPhotoAdminAccess,
  useGetHeroPhotos,
  useRequestHeroPhotoUpload,
} from '@workspace/api-client-react';

const MAX_SIZE = 10 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const adminRequest = (key: string) => ({ headers: { Authorization: `Bearer ${key}` } });
const photoUrl = (url: string) => url.startsWith('/api/') || /^https?:\/\//.test(url)
  ? url
  : `${import.meta.env.BASE_URL}${url.replace(/^\/+/, '')}`;

function transferFile(file: File, uploadURL: string, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadURL);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error(`La carga falló (${xhr.status}).`));
    xhr.onerror = () => reject(new Error('No se pudo transferir la foto.'));
    xhr.send(file);
  });
}

export default function AdminPhotos() {
  const client = useQueryClient();
  const [adminKey, setAdminKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const access = useGetHeroPhotoAdminAccess({
    request: adminKey ? adminRequest(adminKey) : undefined,
    query: { queryKey: [...getGetHeroPhotoAdminAccessQueryKey(), attempt], retry: false },
  });
  const photos = useGetHeroPhotos();
  const requestUpload = useRequestHeroPhotoUpload({ request: adminRequest(adminKey) });
  const createPhoto = useCreateHeroPhoto({ request: adminRequest(adminKey) });
  const deletePhoto = useDeleteHeroPhoto({ request: adminRequest(adminKey) });

  function lockPanel() {
    setAdminKey('');
    setKeyInput('');
  }

  function verifyKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = keyInput.trim();
    if (!key) return;
    setAdminKey(key);
    setAttempt((value) => value + 1);
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !alt.trim() || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const pending = await requestUpload.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' },
      });
      await transferFile(file, pending.uploadURL, setProgress);
      await createPhoto.mutateAsync({ data: { uploadId: pending.uploadId, alt: alt.trim() } });
      await client.invalidateQueries({ queryKey: getGetHeroPhotosQueryKey() });
      setFile(null);
      setAlt('');
      setProgress(0);
      setMessage('Foto publicada en el carrusel.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo publicar la foto.');
    } finally {
      setBusy(false);
    }
  }

  async function deletePhotoById(id: string, description: string) {
    if (!window.confirm(`¿Eliminar esta fotografía? ${description}`)) return;
    setMessage('');
    try {
      await deletePhoto.mutateAsync({ id });
      await client.invalidateQueries({ queryKey: getGetHeroPhotosQueryKey() });
      setMessage('Foto eliminada del carrusel.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo eliminar la foto.');
    }
  }

  const authorized = access.data?.configured && access.data.authorized;
  return (
    <main className="min-h-[100dvh] bg-[#e7e3d9] text-[#20343b]">
      <header className="flex items-center justify-between border-b border-[#20343b]/10 bg-[#f5f1e9] px-5 py-4 sm:px-10">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"><ArrowLeft className="h-4 w-4" /> Ver sitio</Link>
        {authorized && <button type="button" onClick={lockPanel} className="inline-flex items-center gap-2 text-xs font-semibold text-[#a23543]"><LockKeyhole className="h-4 w-4" /> Bloquear panel</button>}
      </header>
      {!authorized ? (
        <section className="mx-auto max-w-xl px-5 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a23543]">AltoCoronel / Administración</p>
          <h1 className="mt-4 font-display text-4xl font-semibold">Gestionar fotografías</h1>
          <p className="mt-4 text-sm leading-6 text-[#536169]">Ingresa la clave compartida para administrar el carrusel. No necesitas crear una cuenta.</p>
          <form onSubmit={verifyKey} className="mt-8">
            <label htmlFor="photo-admin-key" className="mb-2 block text-xs font-semibold uppercase">Clave de administración</label>
            <input id="photo-admin-key" data-testid="input-admin-key" type="password" autoComplete="current-password" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} className="w-full border border-[#20343b]/25 bg-[#f5f1e9] px-4 py-3" required />
            {adminKey && <p role="alert" className="mt-3 text-sm text-[#a23543]">{access.data?.configured ? 'La clave no es válida.' : access.isError ? 'No se pudo verificar la clave. Inténtalo otra vez.' : ''}</p>}
            {!access.data?.configured && !access.isPending && <p className="mt-3 text-sm text-[#a23543]">PHOTO_ADMIN_TOKEN no está configurado en Secrets.</p>}
            <button data-testid="button-admin-key-submit" disabled={access.isFetching || !keyInput.trim()} className="mt-5 w-full bg-[#a23543] px-6 py-4 text-xs font-semibold uppercase text-[#f5f1e9] disabled:opacity-50">
              {access.isFetching ? 'Verificando…' : 'Abrir administración'}
            </button>
          </form>
        </section>
      ) : (
        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a23543]">Gestión de fotos</p>
            <h1 className="mt-4 font-display text-4xl font-semibold">Carrusel AltoCoronel</h1>
            <form onSubmit={uploadPhoto} className="mt-8 space-y-4 border-t border-[#20343b]/20 pt-6">
              <label className="block text-xs font-semibold uppercase">Nueva fotografía
                <input type="file" accept={TYPES.join(',')} onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" />
              </label>
              <p className="text-xs text-[#536169]">JPEG, PNG o WEBP · máximo 10 MB</p>
              <label className="block text-xs font-semibold uppercase">Descripción
                <textarea value={alt} onChange={(event) => setAlt(event.target.value)} maxLength={500} required rows={3} className="mt-2 w-full border border-[#20343b]/25 bg-[#f5f1e9] p-3 text-sm" />
              </label>
              {busy && <p role="status" className="text-sm">Subiendo foto… {progress}%</p>}
              {message && <p role="status" className="text-sm">{message}</p>}
              <button disabled={busy || !file || !alt.trim()} className="inline-flex w-full items-center justify-center gap-2 bg-[#20343b] px-5 py-4 text-xs font-semibold uppercase text-white disabled:opacity-50"><UploadCloud className="h-4 w-4" /> Publicar foto</button>
            </form>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {photos.data?.photos.map((photo) => (
              <article key={photo.id} className="overflow-hidden border border-[#20343b]/15 bg-[#f5f1e9]">
                <img src={photoUrl(photo.url)} alt={photo.alt} loading="lazy" className="aspect-[16/10] w-full object-cover" />
                <div className="flex items-center justify-between gap-3 p-4">
                  <p className="text-sm">{photo.alt}</p>
                  {photo.uploaded && <button type="button" aria-label={`Eliminar ${photo.alt}`} onClick={() => void deletePhotoById(photo.id, photo.alt)} className="text-[#a23543]"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
