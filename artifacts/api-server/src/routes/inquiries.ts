import { Router, type IRouter } from "express";
import { db, inquiriesTable } from "@workspace/db";
import { CreateInquiryBody, CreateInquiryResponse } from "@workspace/api-zod";

const router: IRouter = Router();
router.post("/inquiries", async (req, res): Promise<void> => {
  const parsed = CreateInquiryBody.safeParse(req.body);
  if (!parsed.success || (parsed.success && (
    parsed.data.consent !== true ||
    parsed.data.name.trim().length < 2 ||
    !/^\+?[\d\s()-]{8,25}$/.test(parsed.data.phone)
  ))) {
    res.status(400).json({ error: "Revisa tus datos y acepta la autorización de contacto." });
    return;
  }
  try {
    await db.insert(inquiriesTable).values({
      ...parsed.data,
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim().toLowerCase(),
    });
    res.status(201).json(CreateInquiryResponse.parse({
      message: "Solicitud registrada. Tus datos han quedado guardados para contacto.",
    }));
  } catch {
    req.log.error("Unable to register inquiry");
    res.status(500).json({ error: "No pudimos registrar tu solicitud. Inténtalo nuevamente." });
  }
});
export default router;