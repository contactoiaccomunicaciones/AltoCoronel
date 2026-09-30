import { SignIn, SignUp } from '@clerk/react';
import { Link } from 'wouter';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const img = (name: string) => `${import.meta.env.BASE_URL}images/${name}`;

function AuthFrame({ children, eyebrow, heading, description }: {
  children: React.ReactNode;
  eyebrow: string;
  heading: string;
  description: string;
}) {
  return (
    <main className="min-h-[100dvh] bg-[#e7e3d9] text-[#20343b] lg:grid lg:grid-cols-[minmax(340px,44%)_1fr]">
      <aside className="relative min-h-[280px] overflow-hidden bg-[#20343b] text-[#f5f1e9] sm:min-h-[330px] lg:min-h-[100dvh]">
        <img src={img('hero-casa-frente.jpg')} alt="Viviendas AltoCoronel" className="absolute inset-0 h-full w-full object-cover opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#152e36] via-[#152e36]/30 to-[#152e36]/20" />
        <div className="relative flex h-full min-h-[280px] flex-col justify-between p-7 sm:min-h-[330px] sm:p-10 lg:min-h-[100dvh] lg:p-14">
          <Link href="/" data-testid="link-auth-home" className="w-fit border border-[#f5f1e9]/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors hover:bg-[#f5f1e9] hover:text-[#20343b]">← Volver al sitio</Link>
          <div className="max-w-lg">
            <span className="mb-4 block text-xs font-semibold uppercase tracking-[0.27em] text-[#d6e998]">{eyebrow}</span>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{heading}</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-[#f5f1e9]/85">{description}</p>
          </div>
        </div>
      </aside>
      <section className="flex min-h-[560px] flex-col items-center justify-center px-5 py-12 sm:px-10 lg:min-h-[100dvh]">
        <img src={img('miro-logo.png')} alt="Miró" className="mb-10 h-12 w-auto max-w-44 object-contain" />
        {children}
        <p className="mt-8 text-center text-xs leading-6 text-[#647078]">Solo el administrador autorizado puede modificar las fotos del sitio.</p>
      </section>
    </main>
  );
}

export function SignInPage() {
  return (
    <AuthFrame eyebrow="Acceso privado · AltoCoronel" heading="Un espacio para cuidar cada detalle." description="Ingresa a la administración de fotografías. El sitio público permanece disponible para todos.">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/administrar-fotos`} />
    </AuthFrame>
  );
}

export function SignUpPage() {
  return (
    <AuthFrame eyebrow="Registro · AltoCoronel" heading="Bienvenido a AltoCoronel." description="Crea tu cuenta para acceder. Los permisos para gestionar fotografías se verifican de forma segura.">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/administrar-fotos`} />
    </AuthFrame>
  );
}