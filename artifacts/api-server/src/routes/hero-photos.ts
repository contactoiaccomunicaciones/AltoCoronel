import { randomUUID } from "node:crypto";
import { and, asc, count, eq, lt, sql } from "drizzle-orm";
import type { File } from "@google-cloud/storage";
import sharp from "sharp";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateHeroPhotoBody,
  CreateHeroPhotoResponse,
  DeleteHeroPhotoParams,
  GetHeroPhotoAdminAccessResponse,
  GetHeroPhotoImageParams,
  GetHeroPhotosResponse,
  RequestHeroPhotoUploadBody,
  RequestHeroPhotoUploadResponse,
} from "@workspace/api-zod";
import {
  db,
  heroPhotosTable,
  pendingHeroPhotoUploadsTable,
} from "@workspace/db";
import { setObjectAclPolicy } from "../lib/objectAcl";
import { ObjectStorageService, objectStorageClient } from "../lib/objectStorage";
import {
  canFinalizeHeroPhotoUpload,
  getNormalizedHeroPhotoObjectLocation,
  isValidHeroPhotoUploadMetadata,
  isValidPhotoAdminToken,
  isValidPendingHeroObjectPath,
  MAX_HERO_PHOTO_BYTES,
  PHOTO_ADMIN_ID,
} from "../lib/heroPhotoPolicy";

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();
const MAX_PIXELS = 36_000_000;
const MAX_EDGE = 2560;
const MAX_UPLOADED_PHOTOS = 20;
const UPLOAD_MAX_AGE_MS = 30 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const defaultPhotos = [
  {
    id: "original",
    url: "images/hero-alto-coronel.jpg",
    alt: "Vista original del proyecto AltoCoronel: una casa luminosa integrada al paisaje de la costa.",
    uploaded: false,
  },
  {
    id: "casa-esquina",
    url: "images/hero-casa-esquina.jpg",
    alt: "Vista desde la esquina de la casa AltoCoronel, rodeada por el entorno natural.",
    uploaded: false,
  },
  {
    id: "casa-frente",
    url: "images/hero-casa-frente.jpg",
    alt: "Vista frontal de la casa AltoCoronel y su acceso principal.",
    uploaded: false,
  },
] as const;

function configuredAdminToken(): string | null {
  const token = process.env.PHOTO_ADMIN_TOKEN?.trim();
  return token || null;
}

function presentedAdminToken(req: Request): string | null {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function resolveAdminAccess(req: Request): {
  authorized: boolean;
  configured: boolean;
} {
  const configuredToken = configuredAdminToken();
  return {
    authorized: isValidPhotoAdminToken(presentedAdminToken(req), configuredToken),
    configured: configuredToken !== null,
  };
}

function isSameOrigin(req: Request): boolean {
  const origin = req.get("origin");
  if (!origin || origin === "null") return false;

  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.get("host");
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  if (!host) return false;

  try {
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

function requireAdmin(
  req: Request,
  res: Response,
): string | null {
  const access = resolveAdminAccess(req);
  if (!access.configured) {
    res.status(503).json({ error: "La administración de fotos no está configurada." });
    return null;
  }
  if (!access.authorized) {
    res.status(401).json({ error: "La clave de administración no es válida." });
    return null;
  }
  return PHOTO_ADMIN_ID;
}

async function uploadedPhotoCount(): Promise<number> {
  const [result] = await db.select({ value: count() }).from(heroPhotosTable);
  return result?.value ?? 0;
}

router.get("/hero-photos", async (req, res): Promise<void> => {
  try {
    const uploaded = await db
      .select()
      .from(heroPhotosTable)
      .orderBy(asc(heroPhotosTable.sequence));
    res.json(
      GetHeroPhotosResponse.parse({
        photos: [
          ...defaultPhotos,
          ...uploaded.map((photo) => ({
            id: photo.id,
            url: `/api/hero-photos/${photo.id}/image`,
            alt: photo.alt,
            uploaded: true,
          })),
        ],
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Unable to list hero photos");
    res.status(500).json({ error: "No se pudieron cargar las fotos del carrusel." });
  }
});

router.get("/hero-photos/admin-access", async (req, res): Promise<void> => {
  res.json(GetHeroPhotoAdminAccessResponse.parse(resolveAdminAccess(req)));
});

router.post("/hero-photos/uploads", async (req, res): Promise<void> => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "La solicitud debe provenir de este sitio." });
    return;
  }
  const userId = requireAdmin(req, res);
  if (!userId) return;

  const parsed = RequestHeroPhotoUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Los datos del archivo no son válidos." });
    return;
  }
  if (!isValidHeroPhotoUploadMetadata(parsed.data)) {
    res.status(400).json({ error: "La imagen no puede superar los 10 MB." });
    return;
  }

  try {
    const photoCount = await uploadedPhotoCount();
    if (photoCount >= MAX_UPLOADED_PHOTOS) {
      res.status(409).json({ error: "Se alcanzó el máximo de 20 fotos cargadas." });
      return;
    }

    await db
      .delete(pendingHeroPhotoUploadsTable)
      .where(lt(pendingHeroPhotoUploadsTable.createdAt, new Date(Date.now() - UPLOAD_MAX_AGE_MS)));

    const uploadURL = await objectStorage.getObjectEntityUploadURL();
    const objectPath = objectStorage.normalizeObjectEntityPath(uploadURL);
    if (!objectPath.startsWith("/objects/")) {
      req.log.error({ objectPath }, "Signed upload URL produced an invalid object path");
      res.status(500).json({ error: "No se pudo preparar la carga de la imagen." });
      return;
    }

    const uploadId = randomUUID();
    await db.insert(pendingHeroPhotoUploadsTable).values({
      id: uploadId,
      objectPath,
      uploadedBy: userId,
      name: parsed.data.name,
      declaredSize: parsed.data.size,
      contentType: parsed.data.contentType,
    });

    res.json(
      RequestHeroPhotoUploadResponse.parse({ uploadURL, uploadId, objectPath }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Unable to issue hero photo upload URL");
    res.status(500).json({ error: "No se pudo preparar la carga de la imagen." });
  }
});

router.post("/hero-photos", async (req, res): Promise<void> => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "La solicitud debe provenir de este sitio." });
    return;
  }
  const userId = requireAdmin(req, res);
  if (!userId) return;

  const parsed = CreateHeroPhotoBody.safeParse(req.body);
  if (!parsed.success || !UUID_PATTERN.test(parsed.data.uploadId)) {
    res.status(400).json({ error: "El identificador o la descripción de la foto no son válidos." });
    return;
  }

  let normalizedFile: File | undefined;
  let photoPersisted = false;
  try {
    const [pending] = await db
      .select()
      .from(pendingHeroPhotoUploadsTable)
      .where(
        and(
          eq(pendingHeroPhotoUploadsTable.id, parsed.data.uploadId),
          eq(pendingHeroPhotoUploadsTable.uploadedBy, userId),
        ),
      )
      .limit(1);
    if (!pending) {
      res.status(404).json({ error: "No se encontró una carga pendiente para esta cuenta." });
      return;
    }
    if (!isValidPendingHeroObjectPath(pending.objectPath)) {
      req.log.error({ uploadId: pending.id }, "Pending hero photo has an invalid storage path");
      res.status(500).json({ error: "La carga pendiente tiene una ruta de almacenamiento inválida." });
      return;
    }
    if (
      !canFinalizeHeroPhotoUpload(
        pending,
        userId,
        Date.now(),
        UPLOAD_MAX_AGE_MS,
      )
    ) {
      res.status(410).json({ error: "La carga pendiente venció o ya no es válida." });
      return;
    }

    const sourceFile = await objectStorage.getObjectEntityFile(pending.objectPath);
    const [sourceMetadata] = await sourceFile.getMetadata();
    const storedSize = Number(sourceMetadata.size);
    if (
      !Number.isFinite(storedSize) ||
      storedSize <= 0 ||
      storedSize > MAX_HERO_PHOTO_BYTES ||
      storedSize !== pending.declaredSize
    ) {
      res.status(400).json({ error: "El tamaño real del archivo no coincide con la carga solicitada." });
      return;
    }
    const [rawBytes] = await sourceFile.download();
    if (
      rawBytes.length === 0 ||
      rawBytes.length > MAX_HERO_PHOTO_BYTES ||
      rawBytes.length !== pending.declaredSize
    ) {
      res.status(400).json({ error: "El tamaño real del archivo no coincide con la carga solicitada." });
      return;
    }

    const inputImage = sharp(rawBytes, {
      failOn: "error",
      limitInputPixels: MAX_PIXELS,
    });
    const metadata = await inputImage.metadata();
    const actualContentType =
      metadata.format === "jpeg"
        ? "image/jpeg"
        : metadata.format === "png"
          ? "image/png"
          : metadata.format === "webp"
            ? "image/webp"
            : null;
    if (!actualContentType || actualContentType !== pending.contentType) {
      res.status(400).json({ error: "El contenido real no coincide con un formato JPEG, PNG o WEBP permitido." });
      return;
    }
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > MAX_PIXELS
    ) {
      res.status(400).json({ error: "La imagen supera la resolución máxima permitida." });
      return;
    }

    const normalized = await sharp(rawBytes, {
      failOn: "error",
      limitInputPixels: MAX_PIXELS,
    })
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    const photoId = randomUUID();
    const normalizedLocation = getNormalizedHeroPhotoObjectLocation(
      objectStorage.getPrivateObjectDir(),
      photoId,
    );
    const objectPath = normalizedLocation.objectPath;
    normalizedFile = objectStorageClient
      .bucket(normalizedLocation.bucketName)
      .file(normalizedLocation.objectName);
    await normalizedFile.save(normalized, {
      resumable: false,
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    await setObjectAclPolicy(normalizedFile, {
      owner: userId,
      visibility: "public",
    });

    let inserted: typeof heroPhotosTable.$inferSelect | undefined;
    await db.transaction(async (transaction) => {
      await transaction.execute(sql`select pg_advisory_xact_lock(726041821)`);
      const [photoCount] = await transaction
        .select({ value: count() })
        .from(heroPhotosTable);
      if ((photoCount?.value ?? 0) >= MAX_UPLOADED_PHOTOS) {
        throw new Error("HERO_PHOTO_LIMIT_REACHED");
      }
      const [consumed] = await transaction
        .delete(pendingHeroPhotoUploadsTable)
        .where(
          and(
            eq(pendingHeroPhotoUploadsTable.id, pending.id),
            eq(pendingHeroPhotoUploadsTable.uploadedBy, userId),
          ),
        )
        .returning();
      if (!consumed) {
        throw new Error("HERO_PHOTO_UPLOAD_ALREADY_CONSUMED");
      }
      [inserted] = await transaction
        .insert(heroPhotosTable)
        .values({ objectPath, alt: parsed.data.alt.trim(), uploadedBy: userId })
        .returning();
    });
    photoPersisted = true;

    try {
      await sourceFile.delete();
    } catch (error) {
      req.log.warn({ err: error, uploadId: pending.id }, "Unable to remove raw hero photo upload");
    }

    if (!inserted) {
      throw new Error("Hero photo record was not created");
    }
    res.status(201).json(
      CreateHeroPhotoResponse.parse({
        id: inserted.id,
        url: `/api/hero-photos/${inserted.id}/image`,
        alt: inserted.alt,
        uploaded: true,
      }),
    );
  } catch (error) {
    if (normalizedFile && !photoPersisted) {
      try {
        await normalizedFile.delete();
      } catch (cleanupError) {
        req.log.error({ err: cleanupError }, "Unable to remove unlisted normalized hero photo");
      }
    }
    if (error instanceof Error && error.message === "HERO_PHOTO_LIMIT_REACHED") {
      res.status(409).json({ error: "Se alcanzó el máximo de 20 fotos cargadas." });
      return;
    }
    if (error instanceof Error && error.message === "HERO_PHOTO_UPLOAD_ALREADY_CONSUMED") {
      res.status(409).json({ error: "La carga ya fue finalizada o dejó de estar disponible." });
      return;
    }
    req.log.error({ err: error, uploadId: parsed.data.uploadId }, "Unable to finalize hero photo");
    res.status(400).json({ error: "No se pudo validar o guardar la imagen cargada." });
  }
});

router.delete("/hero-photos/:id", async (req, res): Promise<void> => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "La solicitud debe provenir de este sitio." });
    return;
  }
  const userId = requireAdmin(req, res);
  if (!userId) return;

  const params = DeleteHeroPhotoParams.safeParse(req.params);
  if (!params.success || !UUID_PATTERN.test(params.data.id)) {
    res.status(400).json({ error: "El identificador de la foto no es válido." });
    return;
  }

  try {
    const photo = await db.transaction(async (transaction) => {
      const [record] = await transaction
        .select()
        .from(heroPhotosTable)
        .where(eq(heroPhotosTable.id, params.data.id))
        .limit(1);
      if (!record) return null;
      const [deleted] = await transaction
        .delete(heroPhotosTable)
        .where(eq(heroPhotosTable.id, record.id))
        .returning({ id: heroPhotosTable.id });
      return deleted ? record : null;
    });
    if (!photo) {
      res.status(404).json({ error: "No se encontró una foto cargada con ese identificador." });
      return;
    }
    try {
      const file = await objectStorage.getObjectEntityFile(photo.objectPath);
      await file.delete();
    } catch (error) {
      req.log.warn(
        { err: error, photoId: photo.id, objectPath: photo.objectPath },
        "Hero photo record was deleted but storage cleanup failed",
      );
    }
    res.sendStatus(204);
  } catch (error) {
    req.log.error({ err: error, photoId: params.data.id }, "Unable to delete hero photo");
    res.status(500).json({ error: "No se pudo eliminar la foto." });
  }
});

router.get("/hero-photos/:id/image", async (req, res): Promise<void> => {
  const params = GetHeroPhotoImageParams.safeParse(req.params);
  if (!params.success || !UUID_PATTERN.test(params.data.id)) {
    res.status(400).json({ error: "El identificador de la foto no es válido." });
    return;
  }
  try {
    const [photo] = await db
      .select({ objectPath: heroPhotosTable.objectPath })
      .from(heroPhotosTable)
      .where(eq(heroPhotosTable.id, params.data.id))
      .limit(1);
    if (!photo) {
      res.status(404).json({ error: "No se encontró una foto cargada con ese identificador." });
      return;
    }
    const file = await objectStorage.getObjectEntityFile(photo.objectPath);
    res.set({
      "Content-Type": "image/jpeg",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600",
    });
    file.createReadStream().on("error", (error) => {
      req.log.error({ err: error, photoId: params.data.id }, "Unable to stream hero photo");
      if (!res.headersSent) {
        res.status(500).json({ error: "No se pudo servir la imagen." });
      } else {
        res.destroy(error);
      }
    }).pipe(res);
  } catch (error) {
    req.log.error({ err: error, photoId: params.data.id }, "Unable to serve hero photo");
    res.status(500).json({ error: "No se pudo servir la imagen." });
  }
});

export default router;