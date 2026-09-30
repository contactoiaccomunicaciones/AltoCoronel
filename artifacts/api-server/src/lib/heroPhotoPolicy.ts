export const MAX_HERO_PHOTO_BYTES = 10 * 1024 * 1024;
export const ALLOWED_HERO_PHOTO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PENDING_OBJECT_PATH_PATTERN =
  /^\/objects\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVerifiedPhotoAdmin(
  primaryEmail: { emailAddress: string; verified: boolean } | null | undefined,
  configuredEmail: string | null | undefined,
): boolean {
  const normalizedConfiguredEmail = configuredEmail?.trim().toLowerCase();
  return Boolean(
    normalizedConfiguredEmail &&
      primaryEmail?.verified &&
      primaryEmail.emailAddress.trim().toLowerCase() === normalizedConfiguredEmail,
  );
}

export function isValidHeroPhotoUploadMetadata(input: {
  size: number;
  contentType: string;
}): boolean {
  return (
    Number.isInteger(input.size) &&
    input.size > 0 &&
    input.size <= MAX_HERO_PHOTO_BYTES &&
    ALLOWED_HERO_PHOTO_CONTENT_TYPES.includes(
      input.contentType as (typeof ALLOWED_HERO_PHOTO_CONTENT_TYPES)[number],
    )
  );
}

export function canFinalizeHeroPhotoUpload(
  pending: { uploadedBy: string; createdAt: Date },
  userId: string,
  now: number,
  maxAgeMs: number,
): boolean {
  const ageMs = now - pending.createdAt.getTime();
  return pending.uploadedBy === userId && ageMs >= 0 && ageMs <= maxAgeMs;
}

export function isValidPendingHeroObjectPath(objectPath: string): boolean {
  return PENDING_OBJECT_PATH_PATTERN.test(objectPath);
}

export function getNormalizedHeroPhotoObjectLocation(
  privateObjectDir: string,
  photoId: string,
): { objectPath: string; bucketName: string; objectName: string } {
  if (!UUID_PATTERN.test(photoId)) {
    throw new Error("Invalid hero photo identifier");
  }

  const normalizedDir = privateObjectDir.trim().replace(/\/+$/, "");
  const pathSegments = normalizedDir.replace(/^\/+/, "").split("/");
  if (
    !normalizedDir ||
    pathSegments.length < 2 ||
    pathSegments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Invalid private object directory");
  }

  const bucketName = pathSegments[0];
  const objectName = [...pathSegments.slice(1), "photos", `${photoId}.jpg`].join("/");
  return {
    objectPath: `/objects/photos/${photoId}.jpg`,
    bucketName,
    objectName,
  };
}