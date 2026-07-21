import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './providers'
import Script from 'next/script'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'VF Nexus Atendimento — App operacional',
  description: 'VF Nexus Atendimento: aplicativo operacional para bares e restaurantes com mesas, comandas, cozinha, caixa e notificações.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    shortcut: '/favicon.ico',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VF Nexus Atendimento',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#04070D',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
      <Script id="vf-theme-and-branding-cache" strategy="beforeInteractive">{`
        try {
          var mode = localStorage.getItem('vf_nexus_theme') || 'system';
          var resolved = mode === 'system' ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
          document.documentElement.dataset.theme = resolved;
          document.documentElement.dataset.themeMode = mode;
          document.documentElement.classList.toggle('dark', resolved === 'dark');
        } catch(e) {}
        try {
          var raw = localStorage.getItem('vf-nexus-branding-v2');
          if (raw) {
            var b = JSON.parse(raw);
            var r = document.documentElement;
            var set = function(k,v){ if(v && typeof v === 'string' && v.length <= 24) r.style.setProperty(k,v); };
            // V8: evita cache antigo quebrar contraste no modo claro/escuro.
            // A identidade da empresa mantém cor principal/secundária, mas fundos/textos vêm do tema seguro.
            set('--vf-primary', b.cor_primaria);
            set('--vf-secondary', b.cor_secundaria);
          }
        } catch(e) {}
      `}</Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
