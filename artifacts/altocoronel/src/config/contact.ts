/**
 * Canales oficiales de AltoCoronel.
 * Completa estos valores cuando el equipo comercial los confirme.
 * Mientras estén vacíos, el sitio muestra un aviso de "configuración pendiente"
 * en lugar de enlaces genéricos o números inválidos.
 */
export const CONTACT = {
  /** URL completa del perfil oficial, ej: "https://www.instagram.com/usuario" */
  instagramUrl: "https://www.instagram.com/altocoronel/",
  /** Correo comercial oficial */
  email: "aemunoz.y@gmail.com",
  /** Número WhatsApp en formato internacional sin "+" ni espacios, ej: "56912345678" */
  whatsappNumber: "56957694999",
};

export const instagramReady = /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?$/.test(CONTACT.instagramUrl);
export const whatsappDigits = CONTACT.whatsappNumber.replace(/\D/g, "");
export const whatsappReady = /^56\d{9}$/.test(whatsappDigits);
export const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CONTACT.email);

export const whatsappLink = (text = "Hola, me interesa el proyecto AltoCoronel.") =>
  `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(text)}`;

export const instagramHandle = instagramReady
  ? "@" + CONTACT.instagramUrl.replace(/\/$/, "").split("/").pop()
  : "";
