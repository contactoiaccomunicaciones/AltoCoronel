import assert from "node:assert/strict";
import test from "node:test";
import {
  canFinalizeHeroPhotoUpload,
  getNormalizedHeroPhotoObjectLocation,
  isValidHeroPhotoUploadMetadata,
  isValidPendingHeroObjectPath,
  isValidPhotoAdminToken,
  MAX_HERO_PHOTO_BYTES,
} from "../src/lib/heroPhotoPolicy.ts";

const uploadId = "b8f7c20a-2ed4-4d28-966d-28a188630df0";

test("photo administration token matches only the configured secret", () => {
  assert.equal(isValidPhotoAdminToken("shared-secret", "shared-secret"), true);
  assert.equal(isValidPhotoAdminToken("wrong-secret", "shared-secret"), false);
  assert.equal(isValidPhotoAdminToken("", "shared-secret"), false);
  assert.equal(isValidPhotoAdminToken("shared-secret", undefined), false);
});

test("upload metadata accepts only supported formats and the 10 MB limit", () => {
  assert.equal(isValidHeroPhotoUploadMetadata({ size: MAX_HERO_PHOTO_BYTES, contentType: "image/jpeg" }), true);
  assert.equal(isValidHeroPhotoUploadMetadata({ size: MAX_HERO_PHOTO_BYTES + 1, contentType: "image/jpeg" }), false);
  assert.equal(isValidHeroPhotoUploadMetadata({ size: 20, contentType: "image/svg+xml" }), false);
  assert.equal(isValidHeroPhotoUploadMetadata({ size: 0, contentType: "image/png" }), false);
});

test("finalization is bound to its owner and the pending-upload age window", () => {
  const now = Date.now();
  const pending = { uploadedBy: "shared-photo-admin", createdAt: new Date(now - 1_000) };
  assert.equal(canFinalizeHeroPhotoUpload(pending, "shared-photo-admin", now, 30_000), true);
  assert.equal(canFinalizeHeroPhotoUpload(pending, "other-admin", now, 30_000), false);
  assert.equal(
    canFinalizeHeroPhotoUpload({ ...pending, createdAt: new Date(now - 31_000) }, "shared-photo-admin", now, 30_000),
    false,
  );
  assert.equal(
    canFinalizeHeroPhotoUpload({ ...pending, createdAt: new Date(now + 1) }, "shared-photo-admin", now, 30_000),
    false,
  );
});

test("pending object paths are restricted to generated upload entity paths", () => {
  assert.equal(isValidPendingHeroObjectPath(`/objects/uploads/${uploadId}`), true);
  assert.equal(isValidPendingHeroObjectPath(`/objects/uploads/../${uploadId}`), false);
  assert.equal(isValidPendingHeroObjectPath(`/objects/photos/${uploadId}.jpg`), false);
});

test("normalized object paths stay under the configured private directory", () => {
  assert.deepEqual(
    getNormalizedHeroPhotoObjectLocation("/bucket/private", uploadId),
    {
      objectPath: `/objects/photos/${uploadId}.jpg`,
      bucketName: "bucket",
      objectName: `private/photos/${uploadId}.jpg`,
    },
  );
  assert.throws(() => getNormalizedHeroPhotoObjectLocation("/bucket/../outside", uploadId));
  assert.throws(() => getNormalizedHeroPhotoObjectLocation("/bucket/private", "not-a-uuid"));
});