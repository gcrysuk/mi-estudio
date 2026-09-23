import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  FileText,
  FolderKanban,
  CheckCircle2,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";

const FEATURES = [
  {
    icon: Bell,
    title: "Notificaciones MEV al instante",
    body: "Cada movimiento en el expediente electrónico llega solo, sin que nadie tenga que entrar a chequear el MEV a mano.",
  },
  {
    icon: Calendar,
    title: "Vencimientos que no se pisan",
    body: "Plazos, audiencias y tareas en un calendario único, con alertas configurables por vos, no por un umbral fijo del sistema.",
  },
  {
    icon: FolderKanban,
    title: "Un tablero por estudio, no por abogado",
    body: "Carpetas activas, inactivas y archivadas separadas de un vistazo, con el estado real de cada causa.",
  },
  {
    icon: FileText,
    title: "Todo el expediente en un solo lugar",
    body: "Movimientos, minutas y transcripciones con formato, sin salir del sistema ni perder versiones en Word.",
  },
];

const STATS = [
  { value: "24/7", label: "Monitoreo del MEV" },
  { value: "0", label: "Notificaciones perdidas" },
  { value: "1", label: "Panel para todo el estudio" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-stone-100 text-slate-900 font-sans">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-slate-900/10 bg-stone-100/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10 lg:py-5">
          <div className="font-serif text-xl tracking-tight lg:text-2xl">Mi Estudio</div>

          <nav className="hidden items-center gap-8 text-sm md:flex lg:gap-10 lg:text-base">
            <a href="#funciones" className="hover:opacity-70">Funciones</a>
            <a href="#estudio" className="hover:opacity-70">Para tu estudio</a>
            <a href="#precios" className="hover:opacity-70">Precios</a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={() => navigate('/login')}
              className="rounded-md border border-slate-900 px-4 py-2 text-sm hover:bg-slate-900 hover:text-stone-100 transition-colors lg:px-5 lg:py-2.5 lg:text-base"
            >
              Ingresar
            </button>
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-900/10 px-6 py-4 md:hidden">
            <div className="flex flex-col gap-4 text-sm">
              <a href="#funciones">Funciones</a>
              <a href="#estudio">Para tu estudio</a>
              <a href="#precios">Precios</a>
              <button
                onClick={() => { setMenuOpen(false); navigate('/login'); }}
                className="rounded-md border border-slate-900 px-4 py-2 text-left"
              >
                Ingresar
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 lg:px-10 lg:pt-28 lg:pb-28">
        <div className="grid items-center gap-14 md:grid-cols-2 lg:gap-20">
          <div>
            <h1 className="font-serif text-4xl leading-[1.1] md:text-5xl lg:text-6xl">
              El expediente se mueve. Vos te enterás primero.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-900/75 lg:max-w-lg lg:text-xl">
              Mi Estudio conecta tu estudio jurídico con el MEV y organiza cada causa,
              vencimiento y movimiento en un solo panel, para que dejes de revisar
              a mano lo que el sistema puede avisarte solo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/registro')}
                className="rounded-md bg-emerald-800 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-900 transition-colors lg:px-7 lg:py-3.5 lg:text-base"
              >
                Empezar prueba de 90 días
              </button>
              <button
                onClick={() => navigate('/login')}
                className="text-sm underline decoration-slate-900/30 underline-offset-4 hover:decoration-slate-900 lg:text-base"
              >
                Ya tengo cuenta
              </button>
            </div>
          </div>

          {/* Hero image - simple, sin superposición */}
          <div className="rounded-lg overflow-hidden border border-slate-900/10 shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?fm=jpg&q=70&w=1000&auto=format&fit=crop"
              alt="Escritorio de estudio jurídico"
              className="aspect-video w-full object-cover lg:aspect-square"
            />
            {/* Panel mockup debajo de la imagen, no superpuesto */}
            <div className="border-t border-slate-900/10 bg-white">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-900/10">
                <span className="font-serif text-sm">Panel de notificaciones</span>
                <Bell size={16} className="text-emerald-800" />
              </div>
              <div className="divide-y divide-slate-900/8">
                {[
                  { title: "Cédula recibida — Expte. 4021/24", tag: "MEV", time: "hace 12 min" },
                  { title: "Vencimiento de plazo — Ferreyra c/ Municipalidad", tag: "Plazo", time: "hoy" },
                  { title: "Carpeta compartida por Ariel Crysuk", tag: "Sistema", time: "ayer" },
                ].map((n) => (
                  <div key={n.title} className="flex items-start gap-3 px-5 py-3">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-800" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{n.title}</p>
                      <p className="mt-1 text-xs text-slate-900/50">{n.tag} · {n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="mt-20 grid grid-cols-3 gap-6 border-t border-slate-900/10 pt-10 lg:mt-24 lg:pt-12">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="font-serif text-3xl md:text-4xl lg:text-5xl">{s.value}</p>
              <p className="mt-1 text-sm text-slate-900/60 lg:text-base">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="funciones" className="bg-slate-900 px-6 py-20 text-stone-100 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <h2 className="max-w-lg font-serif text-3xl leading-tight md:text-4xl lg:max-w-xl lg:text-5xl">
            Lo que hoy hacés a mano, revisando el MEV pestaña por pestaña.
          </h2>
          <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:mt-16 lg:gap-x-16 lg:gap-y-14">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <Icon size={22} className="mt-1 shrink-0 text-emerald-300 lg:size-6" />
                <div>
                  <h3 className="font-serif text-lg lg:text-xl">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-100/65 lg:text-base">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARA TU ESTUDIO */}
      <section id="estudio" className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="grid items-center gap-14 md:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="font-serif text-3xl leading-tight md:text-4xl lg:text-5xl">
              Pensado para cómo trabaja un estudio en Argentina.
            </h2>
            <p className="mt-6 text-slate-900/75 leading-relaxed lg:text-lg">
              No es un sistema genérico traducido. Mi Estudio nace del uso diario de
              estudios que litigan todos los días con el fuero provincial y necesitan
              que ninguna cédula se pierda en el camino.
            </p>
            <ul className="mt-8 space-y-4 text-sm lg:text-base">
              {[
                "Integración directa con el sistema de notificaciones MEV",
                "Umbrales de aviso configurables por usuario y por tipo de carpeta",
                "Historial de movimientos con minuta y transcripción incluidas",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-800" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-900/10 bg-white p-8 lg:p-10">
            <p className="font-serif text-lg leading-relaxed lg:text-xl">
              "Antes revisaba el MEV a la mañana, al mediodía y a la noche. Ahora
              me llega el aviso apenas se mueve el expediente."
            </p>
            <p className="mt-6 text-sm text-slate-900/60 lg:text-base">Ariel Crysuk, abogado</p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="precios" className="border-t border-slate-900/10 bg-stone-200 px-6 py-20 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl">90 días de prueba, sin tarjeta.</h2>
            <p className="mt-3 text-slate-900/70 lg:text-lg">Después, seguís solo si te sirvió.</p>
          </div>
          <button
            onClick={() => navigate('/registro')}
            className="flex items-center gap-2 rounded-md bg-emerald-800 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-900 transition-colors lg:px-7 lg:py-3.5 lg:text-base"
          >
            Empezar ahora <ArrowUpRight size={16} />
          </button>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-xs text-slate-900/50">
        Mi Estudio — FOCUS TECH S.A.S.
      </footer>
    </div>
  );
}
