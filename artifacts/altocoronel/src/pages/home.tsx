import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateInquiry } from "@workspace/api-client-react";
import { Menu, X, ArrowDown, ArrowUpRight, MapPin, Mail, MessageCircle, Check, ShieldCheck, Loader2, RotateCcw } from "lucide-react";
import { SiInstagram, SiWhatsapp } from "react-icons/si";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { CONTACT, instagramReady, whatsappReady, emailReady, whatsappLink, instagramHandle } from "@/config/contact";

const IMG = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;
const ease = [0.22, 1, 0.36, 1] as const;

const NAV = [
  { id: "proyecto", label: "Proyecto" },
  { id: "modelos", label: "Modelos y Plantas" },
  { id: "ubicacion", label: "Ubicación y Entorno" },
  { id: "contacto", label: "Contacto" },
];

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.9, delay, ease }}>
      {children}
    </motion.div>
  );
}

function RefTag({ className = "" }: { className?: string }) {
  return (
    <span className={`absolute z-10 rounded-sm bg-[hsl(200_30%_13%/0.72)] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[hsl(40_45%_95%)] backdrop-blur ${className}`}>
      Imagen referencial
    </span>
  );
}

function Eyebrow({ n, children, light }: { n: string; children: ReactNode; light?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-xs uppercase tracking-[0.24em] ${light ? "text-[hsl(40_45%_90%/0.75)]" : "text-muted-foreground"}`}>
      <span className="font-display italic normal-case tracking-normal text-base text-primary">{n}</span>
      <span className={`h-px w-10 ${light ? "bg-[hsl(40_45%_90%/0.4)]" : "bg-border"}`} />
      {children}
    </div>
  );
}

type Pending = null | "instagram" | "whatsapp";

function PendingDialog({ kind, onClose }: { kind: Pending; onClose: () => void }) {
  const name = kind === "instagram" ? "Instagram" : "WhatsApp";
  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-sm border-card-border bg-card" data-testid="dialog-config-pending">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-primary">
            {kind === "instagram" ? <SiInstagram className="h-5 w-5" /> : <SiWhatsapp className="h-5 w-5" />}
          </div>
          <DialogTitle className="font-display text-2xl font-normal">{name} oficial en configuración</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Todavía no publicamos el canal oficial de {name} de AltoCoronel. Preferimos no mostrarte una cuenta o número que no esté confirmado.
            Mientras tanto, deja tus datos en el formulario y quedará registrado tu interés.
          </DialogDescription>
        </DialogHeader>
        <a href="#contacto" onClick={onClose} data-testid="button-dialog-go-form"
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:brightness-110">
          Ir al formulario <ArrowDown className="h-4 w-4" />
        </a>
      </DialogContent>
    </Dialog>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 40);
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);
  const solid = scrolled || open;
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${solid ? "bg-background/90 backdrop-blur-md border-b border-border" : "bg-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-10">
        <a href="#inicio" data-testid="link-logo" className={`flex items-baseline gap-1 font-display text-2xl transition-colors ${solid ? "text-foreground" : "text-[hsl(40_45%_96%)]"}`}>
          <img src={`${import.meta.env.BASE_URL}images/miro-logo.png`} alt="Miró Inmobiliaria" className="h-14 w-14 self-center rounded-sm object-contain bg-white mr-2" />
          <span className="self-center text-lg sm:text-xl">Alto<span className="text-primary">Coronel</span></span>
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} data-testid={`link-nav-${n.id}`}
              className={`group relative text-sm transition-colors ${solid ? "text-foreground/80 hover:text-foreground" : "text-[hsl(40_45%_96%/0.85)] hover:text-[hsl(40_45%_96%)]"}`}>
              {n.label}
              <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(!open)} aria-label="Abrir menú" data-testid="button-menu"
            className={`flex h-10 w-10 items-center justify-center md:hidden ${solid ? "text-foreground" : "text-[hsl(40_45%_96%)]"}`}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-16 bottom-0 flex flex-col bg-background px-6 pt-8 md:hidden">
            {NAV.map((n, i) => (
              <motion.a key={n.id} href={`#${n.id}`} onClick={() => setOpen(false)} data-testid={`link-mobile-${n.id}`}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, ease }}
                className="border-b border-border py-5 font-display text-4xl">
                {n.label}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1.15]);
  return (
    <section id="inicio" ref={ref} className="relative min-h-[100dvh] overflow-hidden bg-secondary">
      <motion.img src={IMG("hero.jpg")} alt="Imagen referencial de casas en condominio" style={{ y, scale }}
        className="absolute inset-0 h-full w-full object-cover" data-testid="img-hero" />
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(200_30%_10%/0.9)] via-[hsl(200_30%_10%/0.35)] to-[hsl(200_30%_10%/0.45)]" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-end px-5 pb-12 md:px-10 md:pb-16">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 1 }}
          className="mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[hsl(40_45%_92%/0.85)]">
          <MapPin className="h-3.5 w-3.5" /> Coronel, Región del Biobío
        </motion.p>
        <h1 className="font-display text-[clamp(2.65rem,6vw,6.25rem)] font-light leading-[0.95] tracking-tight text-[hsl(40_45%_96%)]">
          {["En Coronel,", "se puede llegar", "aún más alto."].map((l) => (
            <span key={l} className="block overflow-hidden pb-2">
              <span className="block">{l}</span>
            </span>
          ))}
        </h1>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.9, ease }}
          className="mt-10 grid gap-8 border-t border-[hsl(40_45%_96%/0.25)] pt-8 md:grid-cols-[1fr_auto_auto] md:items-end">
          <p className="max-w-md text-lg leading-relaxed text-[hsl(40_45%_94%/0.88)]">
            Vive junto a tu familia en AltoCoronel, un condominio de 51 casas ubicado en el corazón del barrio más seguro de la comuna.
          </p>
          <div className="text-[hsl(40_45%_96%)]" data-testid="text-hero-price">
            <div className="text-xs uppercase tracking-[0.22em] opacity-70">Desde</div>
            <div className="font-display text-5xl md:text-6xl">2.850 <span className="text-2xl italic">UF</span></div>
          </div>
          <a href="#contacto" data-testid="button-hero-cta"
            className="group inline-flex items-center justify-center gap-3 rounded-sm bg-primary px-7 py-4 text-primary-foreground transition hover:brightness-110">
            Registrar mi interés <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function Proyecto() {
  const facts = [
    { k: "51", l: "casas" },
    { k: "1", l: "condominio" },
    { k: "2.850", l: "UF desde", d: "Precio inicial referencial del proyecto." },
  ];
  return (
    <section id="proyecto" className="relative mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-36">
      <Reveal><Eyebrow n="01">El proyecto</Eyebrow></Reveal>
      <div className="mt-10 grid gap-12 md:grid-cols-12">
        <Reveal className="md:col-span-7">
          <h2 className="font-display text-4xl font-light leading-[1.05] md:text-6xl">
            No buscamos impresionar. Buscamos que <em className="text-primary">llegar a casa</em> se sienta bien.
          </h2>
        </Reveal>
        <Reveal delay={0.15} className="md:col-span-4 md:col-start-9 md:pt-4">
          <p className="text-lg leading-relaxed text-muted-foreground">
            AltoCoronel es un condominio de 51 casas en Coronel. Un proyecto con los pies en la tierra, para familias que quieren dar
            el siguiente paso sin perder de vista lo importante.
          </p>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Los detalles de superficies, programas y etapas se entregarán directamente por el equipo comercial a quienes registren su interés.
          </p>
        </Reveal>
      </div>
      <div className="mt-20 grid border-t border-border md:grid-cols-3">
        {facts.map((f, i) => (
          <Reveal key={f.l} delay={i * 0.1} className={`py-10 md:px-8 ${i > 0 ? "border-t border-border md:border-l md:border-t-0" : "md:pl-0"}`}>
            <div className="flex items-baseline gap-3" data-testid={`text-fact-${i}`}>
              <span className="font-display text-7xl font-light text-foreground md:text-8xl">{f.k}</span>
              <span className="font-display text-xl italic text-primary">{f.l}</span>
            </div>
            {f.d && <p className="mt-4 max-w-xs text-muted-foreground">{f.d}</p>}
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Vivir() {
  return (
    <section id="modelos" className="bg-secondary py-24 text-secondary-foreground md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <Reveal><Eyebrow n="02" light>Modelos y Plantas</Eyebrow></Reveal>
        <Reveal delay={0.1}>
          <h2 className="mt-8 max-w-3xl font-display text-4xl font-light leading-[1.05] md:text-6xl">
            Tu próxima casa, <em className="text-accent">en detalle.</em>
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-5 md:grid-cols-12 md:grid-rows-[auto_auto]">
          <Reveal className="relative overflow-hidden rounded-sm md:col-span-7 md:row-span-2">
            <RefTag className="left-4 top-4" />
            <motion.img whileHover={{ scale: 1.04 }} transition={{ duration: 1.2, ease }} src={IMG("interior.jpg")}
              alt="Imagen referencial de interior" className="aspect-[4/5] h-full w-full object-cover md:aspect-auto" data-testid="img-interior" />
          </Reveal>
          <Reveal delay={0.1} className="relative overflow-hidden rounded-sm md:col-span-5">
            <RefTag className="left-4 top-4" />
            <motion.img whileHover={{ scale: 1.04 }} transition={{ duration: 1.2, ease }} src={IMG("facade.jpg")}
              alt="Imagen referencial de fachada" className="aspect-[4/3] w-full object-cover" data-testid="img-facade" />
          </Reveal>
          <Reveal delay={0.2} className="flex flex-col justify-between gap-8 rounded-sm border border-[hsl(40_45%_95%/0.15)] p-8 md:col-span-5">
            <p className="font-display text-2xl font-light leading-snug md:text-3xl">
              Próximamente: modelos, plantas y superficies oficiales del proyecto.
            </p>
            <p className="text-sm text-[hsl(40_45%_95%/0.6)]">
              Los planos aún no están publicados. Solicita información al equipo comercial. Las imágenes son referenciales y no corresponden a modelos ni terminaciones oficiales.
            </p>
            <a href="#contacto" className="text-accent underline underline-offset-4">Consultar modelos y plantas</a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Coronel() {
  return (
    <section id="ubicacion" className="relative overflow-hidden py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <Reveal><Eyebrow n="03">Ubicación y Entorno</Eyebrow></Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-8 font-display text-6xl font-light leading-none md:text-8xl">Coronel<span className="text-primary">.</span></h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
              Comuna costera de la Región del Biobío, al sur de Concepción. Entre el Pacífico y los cerros, una ciudad con historia propia
              y ritmo de barrio.
            </p>
            <div className="mt-8 rounded-sm border border-dashed border-input p-5 text-sm leading-relaxed text-muted-foreground" data-testid="text-location-note">
              <strong className="font-medium text-foreground">Dirección exacta:</strong> será informada por el equipo comercial. Registra tu interés para recibirla.
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="relative md:col-span-7">
          <div className="relative overflow-hidden rounded-sm">
            <RefTag className="left-4 top-4" />
            <img src={IMG("street.jpg")} alt="Imagen referencial de calle interior de condominio" className="aspect-[4/3] w-full object-cover" data-testid="img-street" />
          </div>
          <svg viewBox="0 0 400 140" className="mt-6 w-full text-foreground" aria-hidden>
            <motion.path d="M10 110 C 80 30, 160 120, 230 60 S 360 40, 390 20" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="1"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2.2, ease }} />
            <circle cx="230" cy="60" r="6" className="fill-primary" />
            <circle cx="230" cy="60" r="14" className="fill-primary" fillOpacity=".15" />
            <text x="244" y="56" className="fill-current font-display" fontSize="14" fontStyle="italic">Coronel</text>
            <text x="10" y="132" className="fill-current" fontSize="9" opacity=".5" letterSpacing="2">OCÉANO PACÍFICO</text>
            <text x="300" y="132" className="fill-current" fontSize="9" opacity=".5" letterSpacing="2">BIOBÍO</text>
          </svg>
        </Reveal>
      </div>
    </section>
  );
}

const schema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre").max(120),
  email: z.string().trim().email("Correo no válido").max(254),
  phone: z.string().trim().min(8, "Mínimo 8 dígitos").max(25).regex(/^[+\d\s()-]+$/, "Solo números, espacios y +"),
  channel: z.enum(["email", "whatsapp"]),
  message: z.string().max(2000).optional(),
  consent: z.boolean().refine((v) => v, "Debes aceptar para continuar"),
});
type FormV = z.infer<typeof schema>;

const inputCls = "w-full border-0 border-b border-input bg-transparent px-0 py-3 text-lg outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";

function Contacto({ onPending, onPrivacy }: { onPending: (k: Pending) => void; onPrivacy: () => void }) {
  const create = useCreateInquiry();
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const form = useForm<FormV>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", phone: "", channel: "email", message: "", consent: false } });

  const onSubmit = async (v: FormV) => {
    setErr(null);
    try {
      await create.mutateAsync({ data: { name: v.name, email: v.email, phone: v.phone, channel: v.channel, message: v.message || undefined, consent: true } });
      setDone(v.name.split(" ")[0]);
      form.reset();
    } catch {
      setErr("No pudimos registrar tu solicitud. Revisa tu conexión e inténtalo nuevamente.");
    }
  };

  return (
    <section id="contacto" className="relative bg-background py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-16 px-5 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <Reveal><Eyebrow n="04">Contacto</Eyebrow></Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-8 font-display text-5xl font-light leading-[1] md:text-7xl">
              Conversemos sobre <em className="text-primary">tu próxima casa.</em>
            </h2>
            <p className="mt-8 max-w-sm text-lg text-muted-foreground">
              Deja tus datos y el equipo de AltoCoronel se pondrá en contacto por el canal que prefieras.
            </p>
          </Reveal>
          <Reveal delay={0.2} className="mt-10 space-y-3">
            {emailReady && (
              <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 text-foreground hover:text-primary" data-testid="link-email">
                <Mail className="h-4 w-4" /> {CONTACT.email}
              </a>
            )}
            <button onClick={() => (whatsappReady ? window.open(whatsappLink(), "_blank", "noopener,noreferrer") : onPending("whatsapp"))}
              data-testid="button-whatsapp" className="flex items-center gap-3 text-foreground hover:text-primary">
              <SiWhatsapp className="h-4 w-4" /> Escribir por WhatsApp
            </button>
            <button onClick={() => (instagramReady ? window.open(CONTACT.instagramUrl, "_blank", "noopener,noreferrer") : onPending("instagram"))}
              data-testid="button-contact-instagram" className="flex items-center gap-3 text-foreground hover:text-primary">
              <SiInstagram className="h-4 w-4" /> {instagramReady ? instagramHandle : "Instagram"}
            </button>
          </Reveal>
        </div>

        <div className="md:col-span-7">
          <AnimatePresence mode="wait">
            {done !== null ? (
              <motion.div key="ok" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-sm border border-card-border bg-card p-10 md:p-14" data-testid="status-success">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-6 w-6" />
                </motion.div>
                <h3 className="mt-8 font-display text-4xl font-light">Solicitud registrada</h3>
                <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
                  Gracias{done ? `, ${done}` : ""}. Guardamos tu interés en AltoCoronel. El equipo comercial revisará tu solicitud para contactarte.
                </p>
                <button onClick={() => setDone(null)} data-testid="button-new-inquiry"
                  className="mt-8 inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline">
                  <RotateCcw className="h-4 w-4" /> Registrar otra solicitud
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Nombre completo</FormLabel>
                        <FormControl><input {...field} autoComplete="name" placeholder="Tu nombre" className={inputCls} data-testid="input-name" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid gap-8 md:grid-cols-2">
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Correo</FormLabel>
                          <FormControl><input {...field} type="email" autoComplete="email" placeholder="nombre@correo.cl" className={inputCls} data-testid="input-email" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Teléfono</FormLabel>
                          <FormControl><input {...field} type="tel" autoComplete="tel" placeholder="+56 9 ..." className={inputCls} data-testid="input-phone" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="channel" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground">¿Cómo prefieres que te contactemos?</FormLabel>
                        <div className="mt-2 grid grid-cols-2 gap-3">
                          {([["email", "Correo", Mail], ["whatsapp", "WhatsApp", MessageCircle]] as const).map(([v, l, Icon]) => (
                            <button type="button" key={v} onClick={() => field.onChange(v)} data-testid={`button-channel-${v}`}
                              className={`relative flex items-center gap-3 rounded-sm border px-5 py-4 text-left transition ${field.value === v ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-foreground"}`}>
                              <Icon className="h-4 w-4" /> {l}
                            </button>
                          ))}
                        </div>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="message" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mensaje (opcional)</FormLabel>
                        <FormControl><textarea {...field} rows={3} placeholder="Cuéntanos qué te gustaría saber" className={`${inputCls} resize-none`} data-testid="input-message" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="consent" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} className="mt-1 rounded-sm" data-testid="checkbox-consent" /></FormControl>
                          <FormLabel className="text-sm font-normal leading-relaxed text-muted-foreground">
                            Acepto que AltoCoronel almacene mis datos para contactarme sobre este proyecto, según la{" "}
                            <button type="button" onClick={onPrivacy} className="text-foreground underline underline-offset-4" data-testid="button-privacy-inline">política de privacidad</button>.
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {err && (
                      <div className="flex items-center justify-between gap-4 rounded-sm border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive" data-testid="status-error">
                        {err}
                        <button type="submit" className="shrink-0 underline">Reintentar</button>
                      </div>
                    )}
                    <button type="submit" disabled={create.isPending} data-testid="button-submit"
                      className="group flex w-full items-center justify-between rounded-sm bg-primary px-7 py-5 text-lg text-primary-foreground transition hover:brightness-110 disabled:opacity-70">
                      {create.isPending ? "Registrando..." : "Registrar mi interés"}
                      {create.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
                    </button>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Tus datos solo se usan para responder tu consulta.</p>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function PrivacyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto rounded-sm bg-card" data-testid="dialog-privacy">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal">Privacidad</DialogTitle>
          <DialogDescription>Cómo tratamos la información que nos entregas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p><strong className="text-foreground">Qué guardamos.</strong> Nombre, correo, teléfono, canal de contacto preferido y el mensaje opcional que escribas.</p>
          <p><strong className="text-foreground">Para qué.</strong> Únicamente para registrar tu interés en AltoCoronel y que el equipo comercial pueda contactarte sobre este proyecto.</p>
          <p><strong className="text-foreground">Qué no hacemos.</strong> No vendemos ni cedemos tus datos a terceros. El formulario no envía correos ni mensajes automáticos: solo registra tu solicitud.</p>
          <p><strong className="text-foreground">Tus derechos.</strong> Puedes solicitar acceso, rectificación o eliminación de tus datos, conforme a la legislación chilena de protección de datos personales, a través de los canales oficiales del proyecto.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Footer({ onPending, onPrivacy }: { onPending: (k: Pending) => void; onPrivacy: () => void }) {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-20 md:px-10">
        <img src={`${import.meta.env.BASE_URL}images/miro-logo.png`} alt="Miró Inmobiliaria" className="mb-8 h-28 w-28 rounded-sm bg-white object-contain" />
        <div className="font-display text-[clamp(3.5rem,14vw,12rem)] font-light leading-none tracking-tight">
          Alto<em className="text-primary">Coronel</em>
        </div>
        <div className="mt-12 grid gap-8 border-t border-[hsl(40_45%_95%/0.15)] pt-8 text-sm md:grid-cols-4">
          <div><div className="text-[hsl(40_45%_95%/0.5)]">Ubicación</div><div className="mt-2">Coronel, Región del Biobío, Chile</div></div>
          <div><div className="text-[hsl(40_45%_95%/0.5)]">Proyecto</div><div className="mt-2">51 casas en condominio · Desde 2.850 UF</div></div>
          <div className="flex flex-col items-start gap-2">
            <div className="text-[hsl(40_45%_95%/0.5)]">Canales</div>
            <button onClick={() => (instagramReady ? window.open(CONTACT.instagramUrl, "_blank", "noopener,noreferrer") : onPending("instagram"))} className="flex items-center gap-2 hover:text-accent" data-testid="button-footer-instagram"><SiInstagram /> Instagram</button>
            <button onClick={() => (whatsappReady ? window.open(whatsappLink(), "_blank", "noopener,noreferrer") : onPending("whatsapp"))} className="flex items-center gap-2 hover:text-accent" data-testid="button-footer-whatsapp"><SiWhatsapp /> WhatsApp</button>
          </div>
          <div className="flex flex-col items-start gap-2">
            <div className="text-[hsl(40_45%_95%/0.5)]">Legal</div>
            <button onClick={onPrivacy} className="hover:text-accent" data-testid="button-footer-privacy">Política de privacidad</button>
          </div>
        </div>
        <p className="mt-12 max-w-3xl text-xs leading-relaxed text-[hsl(40_45%_95%/0.5)]">
          Todas las imágenes de este sitio son referenciales y no representan el proyecto final, sus terminaciones ni su entorno. Precio expresado en UF, sujeto a disponibilidad y a condiciones informadas por el equipo comercial.
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  const [pending, setPending] = useState<Pending>(null);
  const [privacy, setPrivacy] = useState(false);
  return (
    <div className="min-h-[100dvh] overflow-x-hidden">
      <Nav />
      <main>
        <Hero />
        <Proyecto />
        <Vivir />
        <Coronel />
        <Contacto onPending={setPending} onPrivacy={() => setPrivacy(true)} />
      </main>
      <Footer onPending={setPending} onPrivacy={() => setPrivacy(true)} />
      <PendingDialog kind={pending} onClose={() => setPending(null)} />
      <PrivacyDialog open={privacy} onOpenChange={setPrivacy} />
    </div>
  );
}
