import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Home from '@/pages/home';
import NotFound from '@/pages/not-found';
import AdminPhotos from '@/pages/admin-photos';
import { SignInPage, SignUpPage } from '@/components/auth/auth-pages';

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/images/miro-logo.png`,
    socialButtonsPlacement: 'bottom' as const,
  },
  variables: {
    colorPrimary: '#a23543',
    colorForeground: '#20343b',
    colorMutedForeground: '#647078',
    colorDanger: '#ae3340',
    colorBackground: '#f5f1e9',
    colorInput: '#eee9dd',
    colorInputForeground: '#20343b',
    colorNeutral: '#c5bbae',
    fontFamily: "'Century Gothic', 'CenturyGothic', 'URW Gothic', 'Montserrat', sans-serif",
    borderRadius: '4px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#f5f1e9] rounded-sm w-[440px] max-w-full overflow-hidden border border-[#cfc5b8] shadow-[0_20px_60px_rgba(23,40,46,0.12)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: '!text-[#20343b] !font-semibold',
    headerSubtitle: '!text-[#647078]',
    socialButtonsBlockButtonText: '!text-[#20343b]',
    formFieldLabel: '!text-[#20343b]',
    footerActionLink: '!text-[#a23543] !font-semibold',
    footerActionText: '!text-[#647078]',
    dividerText: '!text-[#647078]',
    identityPreviewEditButton: '!text-[#a23543]',
    formFieldSuccessText: '!text-[#3f704e]',
    alertText: '!text-[#872d38]',
    logoBox: '!h-auto !mb-5',
    logoImage: '!max-h-14 !w-auto',
    socialButtonsBlockButton: '!border-[#c5bbae] !bg-[#eee9dd]',
    formButtonPrimary: '!bg-[#a23543] !text-[#f5f1e9] hover:!bg-[#852b38]',
    formFieldInput: '!bg-[#eee9dd] !border-[#c5bbae] !text-[#20343b]',
    footerAction: '!bg-transparent',
    dividerLine: '!bg-[#c5bbae]',
    alert: '!bg-[#f2e6e2]',
    otpCodeFieldInput: '!bg-[#eee9dd] !text-[#20343b]',
    formFieldRow: '!text-[#20343b]',
    main: '!text-[#20343b]',
  },
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: true } },
});

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        client.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/administrar-fotos" component={AdminPhotos} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Bienvenido de nuevo', subtitle: 'Ingresa para administrar las fotografías' } },
        signUp: { start: { title: 'Crea tu cuenta', subtitle: 'Regístrate para continuar' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;