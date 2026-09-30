import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const heroPhotosTable = pgTable("hero_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  sequence: serial("sequence").notNull().unique(),
  objectPath: text("object_path").notNull().unique(),
  alt: text("alt").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pendingHeroPhotoUploadsTable = pgTable("pending_hero_photo_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  objectPath: text("object_path").notNull().unique(),
  uploadedBy: text("uploaded_by").notNull(),
  name: text("name").notNull(),
  declaredSize: integer("declared_size").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertHeroPhotoSchema = createInsertSchema(heroPhotosTable).omit({
  id: true,
  createdAt: true,
});
export type HeroPhoto = typeof heroPhotosTable.$inferSelect;
export type PendingHeroPhotoUpload = typeof pendingHeroPhotoUploadsTable.$inferSelect;