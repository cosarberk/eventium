/**
 * @fileoverview Home / Overview — the flagship landing.
 * A premium, IDE-grade entry: animated hero, live KPIs, quick actions and a
 * live event stream. Real data via existing hooks. Fully responsive, motion-rich.
 */
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useDashboard } from '@/hooks/useDashboard';
import { useEvents } from '@/hooks/useEvents';
import { useNotificationRules } from '@/hooks/useNotifications';
import { usePermissions } from '@/hooks/usePermissions';
import { usePlugins } from '@/hooks/usePlugins';
import { useAuthStore } from '@/storage/auth.store';

/* ── helpers ─────────────────────────────────────────────── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
} as const;

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}sn`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  return `${Math.floor(h / 24)}g`;
}

const SEV: Record<string, string> = {
  CRITICAL: 'bg-severity-critical',
  ERROR: 'bg-severity-critical',
  HIGH: 'bg-severity-high',
  WARNING: 'bg-severity-medium',
  MEDIUM: 'bg-severity-medium',
  INFO: 'bg-severity-info',
  LOW: 'bg-severity-low',
};

/* ── stat card ───────────────────────────────────────────── */
function Stat({
  label,
  value,
  to,
  gradient,
  icon,
}: {
  label: string;
  value: number | string;
  to: string;
  gradient: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div variants={rise}>
      <Link
        to={to}
        className="group relative block overflow-hidden rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-[var(--color-border-secondary)]"
      >
        <div
          className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40 ${gradient}`}
        />
        <div
          className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${gradient}`}
        >
          {icon}
        </div>
        <div className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {value}
        </div>
        <div className="mt-1 text-sm text-[var(--color-text-tertiary)]">{label}</div>
      </Link>
    </motion.div>
  );
}

/* ── quick action ────────────────────────────────────────── */
function Action({
  title,
  desc,
  onClick,
  icon,
}: {
  title: string;
  desc: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <motion.button
      variants={rise}
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-md"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--color-text-primary)]">
          {title}
        </span>
        <span className="block text-xs text-[var(--color-text-tertiary)]">{desc}</span>
      </span>
    </motion.button>
  );
}

const I = {
  plug: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M6 1v3M12 1v3M4 6h10M4 6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V8a2 2 0 00-2-2M7 10h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  grid: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="1" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="10" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="7" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  bolt: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9.5 1L3 10h4l-.5 7L14 8h-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M4.5 7a4.5 4.5 0 019 0c0 5 2.25 6 2.25 6H2.25S4.5 12 4.5 7zM7 15.5a2.2 2.2 0 004 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  live: (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 16h6M9 13v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

/** The Home / Overview landing. */
export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { canManageSources } = usePermissions();
  const { data: plugins } = usePlugins();
  const { dashboards } = useDashboard();
  const { data: events } = useEvents({ limit: 8 });
  const { rules } = useNotificationRules();

  const recent = events?.items ?? [];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-6xl space-y-6"
    >
      {/* Hero */}
      <motion.section
        variants={rise}
        className="relative overflow-hidden rounded-3xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] p-6 sm:p-9"
      >
        {/* aurora */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-20 bottom-[-6rem] h-72 w-72 rounded-full bg-accent-500/20 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]/60 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
            Canlı çalışma alanı
          </span>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Hoş geldin{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-[var(--color-text-secondary)]">
            Plugin verini al, istediğini kur — panel, sayfa, hatta kendi arayüzün. Başlamak için
            ara, sorgula ya da yeni bir board oluştur.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('eventium:command-palette'))}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 transition-colors hover:bg-brand-600"
            >
              {I.search}
              Ara / komut
              <kbd className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('eventium:query-builder'))}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-secondary)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-brand-500/50"
            >
              {I.bolt}
              Query Builder
            </button>
          </div>
        </div>
      </motion.section>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Veri kaynağı"
          value={plugins?.length ?? 0}
          to="/plugins"
          gradient="bg-gradient-to-br from-brand-400 to-brand-600"
          icon={I.plug}
        />
        <Stat
          label="Board"
          value={dashboards?.length ?? 0}
          to="/boards"
          gradient="bg-gradient-to-br from-accent-400 to-accent-600"
          icon={I.grid}
        />
        <Stat
          label="Event (son)"
          value={events?.total ?? 0}
          to="/live"
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          icon={I.bolt}
        />
        <Stat
          label="Kural"
          value={rules?.length ?? 0}
          to="/settings"
          gradient="bg-gradient-to-br from-emerald-400 to-teal-500"
          icon={I.bell}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Quick actions */}
        <motion.section variants={rise} className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Hızlı başla</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Action
              title="Yeni board"
              desc="Sıfırdan bir çalışma alanı kur"
              onClick={() => navigate({ to: '/boards' })}
              icon={I.grid}
            />
            {canManageSources && (
              <Action
                title="Kaynak ekle"
                desc="GitLab, Nexus… bir plugin bağla"
                onClick={() => navigate({ to: '/plugins' })}
                icon={I.plug}
              />
            )}
            <Action
              title="Query Builder"
              desc="Veriyi keşfet, sorgula, önizle"
              onClick={() => window.dispatchEvent(new Event('eventium:query-builder'))}
              icon={I.bolt}
            />
            <Action
              title="Canlı / TV"
              desc="Board'u tam ekran yayınla"
              onClick={() => navigate({ to: '/live' })}
              icon={I.live}
            />
          </div>
        </motion.section>

        {/* Live event stream */}
        <motion.section
          variants={rise}
          className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-primary)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Son olaylar</h2>
            <Link to="/live" className="text-[11px] text-brand-500 hover:text-brand-600">
              Tümü →
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border-primary)] max-h-[22rem] overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[var(--color-text-tertiary)]">
                Henüz olay yok. Bir kaynak bağlayınca burada canlı akacak.
              </p>
            ) : (
              recent.map((e) => (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEV[e.severity] ?? 'bg-[var(--color-border-strong)]'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--color-text-primary)]">{e.title}</p>
                    <p className="truncate text-[11px] text-[var(--color-text-tertiary)]">
                      {e.sourceType} · {timeAgo(e.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
