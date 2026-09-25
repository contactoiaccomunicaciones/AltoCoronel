import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const inquiriesTable = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  channel: text("channel").notNull(),
  message: text("message"),
  consent: boolean("consent").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const insertInquirySchema = createInsertSchema(inquiriesTable).omit({ id: true, createdAt: true });
export type Inquiry = typeof inquiriesTable.$inferSelect;