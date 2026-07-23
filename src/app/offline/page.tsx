export default function OfflinePage() {
  return <main className="min-h-dvh flex items-center justify-center p-6 bg-slate-950 text-white">
    <section className="max-w-md w-full rounded-3xl border border-white/10 bg-[var(--vf-card)]/10 p-6 text-center shadow-2xl">
      <div className="text-5xl mb-4">📴</div>
      <h1 className="text-2xl font-bold">VF Nexus offline</h1>
      <p className="text-white/70 mt-3">O app está instalado, mas a internet caiu. Você ainda pode consultar dados já cacheados e registrar vendas offline quando o PDV estiver sincronizado.</p>
      <a href="/dashboard" className="mt-6 inline-flex rounded-2xl bg-blue-500 px-5 py-3 font-semibold">Tentar novamente</a>
    </section>
  </main>
}
