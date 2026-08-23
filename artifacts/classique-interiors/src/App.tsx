import { useMemo, useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity as ActivityIcon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileBarChart,
  FileText,
  Filter,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  Menu,
  MoreHorizontal,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Store,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  getGetProjectQueryKey,
  getListBoqsQueryKey,
  getListProjectsQueryKey,
  getListQuotationsQueryKey,
  getListVendorsQueryKey,
  useAddBoqItem,
  useCreateBoq,
  useCreateProject,
  useCreateQuotation,
  useCreateVendor,
  useGetDashboard,
  useGetProject,
  useListActivity,
  useListBoqs,
  useListComparisons,
  useListProjects,
  useListQuotations,
  useListVendors,
  useUpdateProject,
} from '@workspace/api-client-react';
import type {
  Activity,
  Boq,
  BoqItem,
  Comparison,
  Dashboard,
  Project,
  ProjectDetail,
  Quotation,
  Vendor,
} from '@workspace/api-client-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/boqs', label: 'BOQs', icon: ClipboardList },
  { href: '/vendors', label: 'Vendors', icon: Store },
  { href: '/quotations', label: 'Quotations', icon: FileText },
  { href: '/comparatives', label: 'Comparatives', icon: ScaleIcon },
];

function ScaleIcon(props: { size?: number; strokeWidth?: number }) {
  return <span className="inline-flex items-center justify-center" {...props}><BarChart3 size={props.size ?? 18} strokeWidth={props.strokeWidth ?? 1.8} /></span>;
}

const money = (value = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const shortMoney = (value = 0) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  return money(value);
};
const dateLabel = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const initials = (name = 'CI') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const toneClass = (tone = '') => {
  const value = tone.toLowerCase();
  if (value.includes('danger') || value.includes('red') || value.includes('high')) return 'bg-[hsl(var(--destructive)/.11)] text-destructive';
  if (value.includes('warning') || value.includes('amber') || value.includes('pending')) return 'bg-[hsl(var(--primary)/.16)] text-[hsl(var(--primary-foreground))]';
  if (value.includes('success') || value.includes('green') || value.includes('approved')) return 'bg-[hsl(var(--secondary)/.13)] text-[hsl(var(--secondary))]';
  return 'bg-muted text-muted-foreground';
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

function EmptyState({ icon: Icon, title, copy, action }: { icon: typeof PackageOpen; title: string; copy: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border bg-card/70 px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-secondary"><Icon size={22} /></div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function PageError({ retry }: { retry: () => void }) {
  return (
    <div className="border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 text-destructive" size={19} />
        <div className="flex-1">
          <p className="font-semibold text-foreground">Could not load this control view</p>
          <p className="mt-1 text-sm text-muted-foreground">The data service did not respond. Your work is safe; try the request again.</p>
        </div>
        <button data-testid="button-retry" onClick={retry} className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-sm font-semibold hover-elevate"><RefreshCw size={14} /> Retry</button>
      </div>
    </div>
  );
}

function StatusPill({ value }: { value?: string }) {
  const status = value || 'Not set';
  const normalized = status.toLowerCase();
  const positive = normalized.includes('active') || normalized.includes('approved') || normalized.includes('valid') || normalized.includes('complete') || normalized.includes('awarded');
  const warning = normalized.includes('pending') || normalized.includes('draft') || normalized.includes('review') || normalized.includes('received');
  const cls = positive ? 'bg-[hsl(var(--secondary)/.13)] text-[hsl(var(--secondary))]' : warning ? 'bg-[hsl(var(--primary)/.18)] text-[hsl(var(--primary-foreground))]' : 'bg-muted text-muted-foreground';
  return <span data-testid={`status-${status.toLowerCase().replace(/\s/g, '-')}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] ${cls}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>;
}

function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'outline' | 'danger' }) {
  const variants = {
    primary: 'bg-primary text-primary-foreground shadow-sm hover:brightness-95',
    quiet: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
    outline: 'border border-border bg-card text-foreground hover:bg-muted',
    danger: 'border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.06)] text-destructive hover:bg-[hsl(var(--destructive)/.12)]',
  };
  return <button {...props} className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}>{children}</button>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const current = navItems.find((item) => item.href === location)?.label || (location.startsWith('/projects/') ? 'Project detail' : 'Workspace');
  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[246px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-sidebar-border px-6">
          <Link href="/" data-testid="link-brand" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center bg-primary font-mono-ui text-sm font-bold text-primary-foreground">CI</span>
            <span><strong className="block text-[15px] tracking-tight">CLASSIQUE</strong><small className="font-mono-ui text-[9px] tracking-[.24em] text-sidebar-foreground/60">INTERIORS</small></span>
          </Link>
          <button data-testid="button-close-navigation" onClick={() => setMobileOpen(false)} className="rounded p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent lg:hidden"><X size={18} /></button>
        </div>
        <div className="px-4 pt-7">
          <p className="mb-3 px-3 font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-sidebar-foreground/40">Workspace</p>
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? location === '/' : location.startsWith(href);
              return <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}><Icon size={17} strokeWidth={active ? 2.2 : 1.8} /><span>{label}</span>{active ? <span className="ml-auto size-1.5 rounded-full bg-primary" /> : null}</Link>;
            })}
          </nav>
        </div>
        <div className="mt-auto px-4 pb-5">
          <div className="mb-4 border border-sidebar-border bg-sidebar-accent/45 p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.1em] text-sidebar-foreground/60"><span className="size-1.5 animate-pulse rounded-full bg-primary" />Live workspace</div>
            <p className="mt-2 text-xs leading-5 text-sidebar-foreground/55">Commercial control is up to date.</p>
          </div>
          <button data-testid="button-settings" onClick={() => setNotice('Workspace settings are managed by your administrator.')} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"><Settings2 size={16} /> Workspace settings</button>
          <div className="mt-4 flex items-center gap-3 border-t border-sidebar-border px-3 pt-4">
            <span className="grid size-8 place-items-center rounded-full bg-secondary font-mono-ui text-xs font-bold text-secondary-foreground">AR</span>
            <div className="min-w-0"><p className="truncate text-xs font-bold">Aarav Rao</p><p className="truncate text-[11px] text-sidebar-foreground/50">Commercial lead</p></div>
            <ChevronDown className="ml-auto text-sidebar-foreground/45" size={14} />
          </div>
        </div>
      </aside>
      {mobileOpen ? <button aria-label="Close navigation" data-testid="button-navigation-overlay" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-[hsl(var(--foreground)/.28)] lg:hidden" /> : null}
      <main className="lg:pl-[246px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur lg:px-9">
          <div className="flex items-center gap-3">
            <button data-testid="button-open-navigation" onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"><Menu size={20} /></button>
            <div><p className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground">Classique / {current}</p><h1 className="mt-1 text-lg font-bold tracking-tight text-foreground">{current}</h1></div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden h-9 w-[210px] items-center gap-2 rounded-md border border-border bg-card px-3 text-muted-foreground md:flex"><Search size={15} /><span className="text-xs">Search anything</span><kbd className="ml-auto border border-border bg-muted px-1.5 py-0.5 font-mono-ui text-[9px]">⌘K</kbd></div>
            <button data-testid="button-notifications" onClick={() => setNotice('You are all caught up.')} className="relative rounded-md border border-border bg-card p-2 text-muted-foreground hover:bg-muted"><Bell size={17} /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" /></button>
            <span className="hidden font-mono-ui text-[10px] uppercase tracking-[.14em] text-muted-foreground xl:inline">09 Jun 2024</span>
          </div>
          {notice ? <button data-testid="button-dismiss-notice" onClick={() => setNotice('')} className="absolute right-5 top-[70px] border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-panel-lg lg:right-9">{notice} <X size={13} className="ml-2 inline text-muted-foreground" /></button> : null}
        </header>
        <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-9 lg:py-9">{children}</div>
      </main>
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow ? <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-secondary">{eyebrow}</p> : null}<h2 className="mt-1 text-2xl font-bold tracking-[-.03em] text-foreground">{title}</h2>{copy ? <p className="mt-1.5 text-sm text-muted-foreground">{copy}</p> : null}</div>{action}</div>;
}

function StatCard({ label, value, meta, trend, icon: Icon, accent = 'amber' }: { label: string; value: string; meta: string; trend?: 'up' | 'down'; icon: typeof CircleDollarSign; accent?: 'amber' | 'teal' | 'ink' }) {
  const bar = accent === 'teal' ? 'bg-secondary' : accent === 'ink' ? 'bg-foreground' : 'bg-primary';
  return <div className="hover-lift relative overflow-hidden border border-card-border bg-card p-5 shadow-panel"><span className={`absolute inset-y-0 left-0 w-1 ${bar}`} /><div className="flex items-start justify-between"><p className="font-mono-ui text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</p><Icon size={18} className="text-muted-foreground/70" /></div><p data-testid={`text-stat-${label.toLowerCase().replace(/\s/g, '-')}`} className="mt-5 font-mono-ui text-2xl font-bold tracking-tight text-foreground">{value}</p><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">{trend ? <span className={`inline-flex items-center gap-0.5 font-bold ${trend === 'up' ? 'text-secondary' : 'text-destructive'}`}>{trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{meta}</span> : <span>{meta}</span>}</div></div>;
}

function ActivityFeed({ items, limit = 5 }: { items?: Activity[]; limit?: number }) {
  if (!items?.length) return <EmptyState icon={ActivityIcon} title="No activity yet" copy="Commercial changes and approvals will appear here as the team works." />;
  return <div className="space-y-0">{items.slice(0, limit).map((item, index) => <div data-testid={`activity-item-${item.id}`} key={item.id} className="relative flex gap-3 border-b border-border py-4 last:border-0"><div className="relative flex flex-col items-center"><span className={`grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold ${toneClass(item.tone)}`}>{initials(item.actor)}</span>{index < Math.min(items.length, limit) - 1 ? <span className="absolute top-9 h-full w-px bg-border" /> : null}</div><div className="min-w-0 flex-1"><p className="text-sm leading-5 text-foreground"><strong>{item.actor}</strong> {item.action} <strong>{item.target}</strong></p><p className="mt-1 font-mono-ui text-[10px] uppercase tracking-[.08em] text-muted-foreground">{item.time}</p></div></div>)}</div>;
}

function DashboardPage() {
  const dashboardQuery = useGetDashboard();
  const activityQuery = useListActivity();
  const [pipelinePeriod, setPipelinePeriod] = useState('This quarter');
  const dashboard = dashboardQuery.data as Dashboard | undefined;
  if (dashboardQuery.isLoading) return <DashboardSkeleton />;
  if (dashboardQuery.isError || !dashboard) return <PageError retry={() => dashboardQuery.refetch()} />;
  const { metrics, pipeline, recentProjects, pendingActions, activity } = dashboard;
  const auditTrail = (activityQuery.data as Activity[] | undefined) || activity;
  const maxPipeline = Math.max(...(pipeline || []).map((item) => item.value), 1);
  return <div className="animate-in">
    <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="font-mono-ui text-[10px] font-bold uppercase tracking-[.2em] text-secondary">Monday, 09 June 2024 / 08:42</p><h2 className="mt-2 text-3xl font-bold tracking-[-.045em] text-foreground sm:text-4xl">Good morning, Aarav.</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">Here is the commercial pulse across the Classique project book.</p></div><div className="flex items-center gap-2"><span className="inline-flex items-center gap-2 border border-[hsl(var(--secondary)/.25)] bg-[hsl(var(--secondary)/.08)] px-3 py-2 text-xs font-semibold text-secondary"><ShieldCheck size={15} /> Data synced 4 min ago</span></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active projects" value={String(metrics.activeProjects)} meta={`${metrics.totalProjects} total in book`} icon={FolderKanban} accent="teal" />
      <StatCard label="Project value" value={shortMoney(metrics.projectValue)} meta="across active projects" icon={CircleDollarSign} accent="amber" />
      <StatCard label="Expected margin" value={`${metrics.expectedMargin.toFixed(1)}%`} meta="vs actual project margin" trend={metrics.actualMargin >= metrics.expectedMargin ? 'up' : 'down'} icon={TrendingUp} accent="ink" />
      <StatCard label="Awaiting action" value={String(metrics.pendingApprovals + metrics.pendingBoqs + metrics.pendingQuotations)} meta={`${metrics.pendingApprovals} approvals need review`} icon={Clock3} accent="amber" />
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <section className="border border-card-border bg-card p-5 shadow-panel sm:p-6"><div className="mb-7 flex items-center justify-between"><div><p className="font-mono-ui text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">Pipeline value</p><h3 className="mt-1 text-lg font-bold">Commercial position</h3></div><button data-testid="button-pipeline-filter" onClick={() => setPipelinePeriod((old) => old === 'This quarter' ? 'All time' : 'This quarter')} className="flex items-center gap-2 border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"><Filter size={13} /> {pipelinePeriod} <ChevronDown size={13} /></button></div><div className="space-y-5">{pipeline.map((item) => <div data-testid={`pipeline-${item.status}`} key={item.status}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-foreground">{item.status}</span><span className="font-mono-ui text-muted-foreground">{item.count} / {shortMoney(item.value)}</span></div><div className="h-2 bg-muted"><div className="h-full bg-secondary transition-all duration-500" style={{ width: `${Math.max((item.value / maxPipeline) * 100, 4)}%` }} /></div></div>)}</div><div className="mt-8 grid grid-cols-3 divide-x divide-border border-t border-border pt-5"><div><p className="text-xs text-muted-foreground">Estimated cost</p><p className="mt-1 font-mono-ui text-sm font-bold">{shortMoney(metrics.estimatedCost)}</p></div><div className="pl-4"><p className="text-xs text-muted-foreground">Actual cost</p><p className="mt-1 font-mono-ui text-sm font-bold">{shortMoney(metrics.actualCost)}</p></div><div className="pl-4"><p className="text-xs text-muted-foreground">Variations</p><p className="mt-1 font-mono-ui text-sm font-bold">{metrics.variations}</p></div></div></section>
      <section className="grid-paper border border-card-border bg-card p-5 shadow-panel sm:p-6"><div className="mb-3 flex items-center justify-between"><div><p className="font-mono-ui text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">Attention queue</p><h3 className="mt-1 text-lg font-bold">Pending actions</h3></div><span className="grid size-7 place-items-center rounded-full bg-primary font-mono-ui text-xs font-bold text-primary-foreground">{pendingActions.length}</span></div>{pendingActions.length ? <div className="divide-y divide-border">{pendingActions.slice(0, 4).map((action) => <div data-testid={`pending-action-${action.id}`} key={action.id} className="flex items-start gap-3 py-4"><span className={`mt-0.5 size-2 shrink-0 rounded-full ${action.priority.toLowerCase().includes('high') ? 'bg-destructive' : 'bg-primary'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{action.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{action.project}</p><p className="mt-1 font-mono-ui text-[10px] uppercase tracking-[.1em] text-secondary">{action.due}</p></div><ChevronRight size={15} className="mt-1 text-muted-foreground" /></div>)}</div> : <EmptyState icon={CheckCircle2} title="Clear runway" copy="No pending commercial actions need your attention." />}</section>
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <section className="border border-card-border bg-card shadow-panel"><div className="flex items-center justify-between border-b border-border px-5 py-5 sm:px-6"><div><p className="font-mono-ui text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">Project book</p><h3 className="mt-1 text-lg font-bold">Recent projects</h3></div><Link data-testid="link-view-projects" href="/projects" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">View all <ArrowUpRight size={14} /></Link></div>{recentProjects.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-muted/60"><tr className="font-mono-ui text-[10px] uppercase tracking-[.12em] text-muted-foreground"><th className="px-5 py-3 font-normal sm:px-6">Project</th><th className="px-3 py-3 font-normal">Stage</th><th className="px-3 py-3 font-normal">Value</th><th className="px-3 py-3 font-normal">Margin</th><th className="px-5 py-3 font-normal sm:px-6">Updated</th></tr></thead><tbody>{recentProjects.slice(0, 6).map((project) => <tr data-testid={`row-project-${project.id}`} key={project.id} className="border-t border-border transition-colors hover:bg-muted/45"><td className="px-5 py-4 sm:px-6"><Link data-testid={`link-project-${project.id}`} href={`/projects/${project.id}`} className="group flex items-center gap-3"><span className="grid size-8 place-items-center bg-accent font-mono-ui text-[10px] font-bold text-secondary">{initials(project.code)}</span><span><span className="block text-sm font-bold group-hover:text-secondary">{project.name}</span><span className="mt-0.5 block font-mono-ui text-[10px] text-muted-foreground">{project.code} / {project.client}</span></span></Link></td><td className="px-3 py-4"><StatusPill value={project.status} /></td><td className="px-3 py-4 font-mono-ui text-xs">{shortMoney(project.value)}</td><td className="px-3 py-4 font-mono-ui text-xs text-secondary">{project.margin.toFixed(1)}%</td><td className="px-5 py-4 font-mono-ui text-[10px] text-muted-foreground sm:px-6">{dateLabel(project.updatedAt)}</td></tr>)}</tbody></table></div> : <div className="p-6"><EmptyState icon={FolderKanban} title="No projects in the book" copy="Create your first project to start building the commercial record." /></div>}</section>
      <section className="border border-card-border bg-card p-5 shadow-panel sm:p-6"><div className="mb-2 flex items-center justify-between"><div><p className="font-mono-ui text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">Audit trail</p><h3 className="mt-1 text-lg font-bold">Latest activity</h3></div><ActivityIcon size={18} className="text-secondary" /></div><ActivityFeed items={auditTrail} limit={5} /></section>
    </div>
  </div>;
}

function DashboardSkeleton() {
  return <div className="space-y-6"><div className="space-y-3"><Skeleton className="h-3 w-48" /><Skeleton className="h-9 w-72" /><Skeleton className="h-4 w-96" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-36" />)}</div><div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;
}

function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.4)] p-0 sm:items-center sm:p-5"><div role="dialog" aria-modal="true" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto bg-card shadow-panel-lg animate-in sm:border sm:border-border"><div className="flex items-start justify-between border-b border-border px-5 py-5 sm:px-7"><div>{eyebrow ? <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[.16em] text-secondary">{eyebrow}</p> : null}<h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2></div><button data-testid="button-close-modal" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></button></div><div className="px-5 py-6 sm:px-7">{children}</div></div></div>;
}

function Field({ label, name, value, onChange, required = false, placeholder, type = 'text' }: { label: string; name: string; value: string | number; onChange: (value: string) => void; required?: boolean; placeholder?: string; type?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-foreground">{label}{required ? <span className="ml-1 text-secondary">*</span> : null}</span><input data-testid={`input-${name}`} name={name} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-secondary focus:ring-2 focus:ring-[hsl(var(--secondary)/.15)]" /></label>;
}

function SelectField({ label, name, value, onChange, options }: { label: string; name: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold">{label}</span><select data-testid={`select-${name}`} name={name} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-[hsl(var(--secondary)/.15)]">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const projectsQuery = useListProjects({ search: search || undefined, status: status || undefined });
  const projects = projectsQuery.data as Project[] | undefined;
  return <div className="animate-in"><SectionHeading eyebrow="Project register" title="Projects" copy="One source of truth for every commercial commitment." action={<Button data-testid="button-open-create-project" onClick={() => setShowCreate(true)}><Plus size={16} /> New project</Button>} /><div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input data-testid="input-project-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project, client or code" className="h-10 w-full border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-secondary" /></label><select data-testid="select-project-status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 border border-input bg-card px-3 text-sm outline-none focus:border-secondary" ><option value="">All stages</option><option value="Active">Active</option><option value="Pipeline">Pipeline</option><option value="Execution">Execution</option><option value="Closed">Closed</option></select></div>{projectsQuery.isLoading ? <ListSkeleton /> : projectsQuery.isError ? <PageError retry={() => projectsQuery.refetch()} /> : projects?.length ? <div className="overflow-x-auto border border-card-border bg-card shadow-panel"><table className="w-full min-w-[880px] text-left"><thead className="bg-muted/65"><tr className="font-mono-ui text-[10px] uppercase tracking-[.12em] text-muted-foreground"><th className="px-5 py-3 font-normal">Project</th><th className="px-3 py-3 font-normal">Client / location</th><th className="px-3 py-3 font-normal">Stage</th><th className="px-3 py-3 font-normal">Value</th><th className="px-3 py-3 font-normal">Margin</th><th className="px-3 py-3 font-normal">Manager</th><th className="px-5 py-3 font-normal">Updated</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id} data-testid={`row-project-register-${project.id}`} className="border-t border-border hover:bg-muted/45"><td className="px-5 py-4"><Link data-testid={`link-project-register-${project.id}`} href={`/projects/${project.id}`} className="flex items-center gap-3"><span className="grid size-9 place-items-center bg-accent font-mono-ui text-[10px] font-bold text-secondary">{initials(project.code)}</span><span><strong className="block text-sm">{project.name}</strong><span className="font-mono-ui text-[10px] text-muted-foreground">{project.code}</span></span></Link></td><td className="px-3 py-4"><p className="text-sm">{project.client}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} />{project.location}</p></td><td className="px-3 py-4"><StatusPill value={project.status} /></td><td className="px-3 py-4 font-mono-ui text-xs">{shortMoney(project.value)}</td><td className="px-3 py-4 font-mono-ui text-xs text-secondary">{project.margin.toFixed(1)}%</td><td className="px-3 py-4 text-xs">{project.manager}</td><td className="px-5 py-4 font-mono-ui text-[10px] text-muted-foreground">{dateLabel(project.updatedAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={FolderKanban} title="No matching projects" copy="Try a different search or create a new project register entry." action={<Button data-testid="button-empty-create-project" onClick={() => setShowCreate(true)}><Plus size={15} /> New project</Button>} />}{showCreate ? <CreateProjectModal onClose={() => setShowCreate(false)} /> : null}</div>;
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const mutation = useCreateProject();
  const [form, setForm] = useState({ name: '', client: '', location: '', projectType: 'Residential', status: 'Pipeline', manager: '', value: '' });
  const update = (key: keyof typeof form) => (value: string) => setForm((old) => ({ ...old, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ data: { ...form, value: form.value ? Number(form.value) : undefined } }, { onSuccess: (project) => { queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }); onClose(); setLocation(`/projects/${project.id}`); } }); };
  return <Modal title="Create project" eyebrow="Project register / new record" onClose={onClose}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Project name" name="project-name" value={form.name} onChange={update('name')} required placeholder="e.g. Park Street Residence" /><Field label="Client" name="client" value={form.client} onChange={update('client')} required placeholder="Client or company" /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Location" name="location" value={form.location} onChange={update('location')} required placeholder="City / site" /><Field label="Manager" name="manager" value={form.manager} onChange={update('manager')} placeholder="Project owner" /></div><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Project type" name="project-type" value={form.projectType} onChange={update('projectType')} options={['Residential', 'Hospitality', 'Commercial', 'Retail', 'Workplace']} /><SelectField label="Stage" name="project-status" value={form.status} onChange={update('status')} options={['Pipeline', 'Active', 'Execution', 'Closed']} /></div><Field label="Estimated project value" name="project-value" type="number" value={form.value} onChange={update('value')} placeholder="₹ value" />{mutation.isError ? <p className="text-sm text-destructive">Project could not be created. Check the fields and try again.</p> : null}<div className="flex justify-end gap-2 border-t border-border pt-5"><Button type="button" variant="outline" data-testid="button-cancel-project" onClick={onClose}>Cancel</Button><Button type="submit" data-testid="button-submit-project" disabled={mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create project'}</Button></div></form></Modal>;
}

function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = Number(params.id);
  const query = useGetProject(projectId, { query: { enabled: Number.isFinite(projectId), queryKey: getGetProjectQueryKey(projectId) } });
  const project = query.data as ProjectDetail | undefined;
  const [tab, setTab] = useState('overview');
  const updateProject = useUpdateProject();
  if (query.isLoading) return <DetailSkeleton />;
  if (query.isError || !project) return <PageError retry={() => query.refetch()} />;
  const saveStatus = (value: string) => updateProject.mutate({ id: project.id, data: { status: value } }, { onSuccess: () => query.refetch() });
  return <div className="animate-in"><button data-testid="button-back-projects" onClick={() => setLocation('/projects')} className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-secondary"><ArrowDownRight size={14} className="rotate-45" /> Back to project register</button><div className="border border-card-border bg-card shadow-panel"><div className="grid-paper border-b border-border p-6 sm:p-8"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center bg-primary font-mono-ui text-sm font-bold text-primary-foreground">{initials(project.code)}</span><div><div className="flex flex-wrap items-center gap-3"><span className="font-mono-ui text-[10px] font-bold uppercase tracking-[.15em] text-secondary">{project.code}</span><StatusPill value={project.status} /></div><h2 className="mt-2 text-3xl font-bold tracking-[-.045em]">{project.name}</h2><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={14} />{project.client} / {project.location}</p></div></div><div className="flex flex-wrap items-center gap-2"><select data-testid="select-project-stage" value={project.status} onChange={(event) => saveStatus(event.target.value)} disabled={updateProject.isPending} className="h-9 border border-border bg-card px-3 text-xs font-semibold"><option>Pipeline</option><option>Active</option><option>Execution</option><option>Closed</option></select><Button data-testid="button-project-more" variant="outline" className="px-2.5"><MoreHorizontal size={17} /></Button></div></div><div className="mt-8 grid gap-5 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Project value</p><p className="mt-1 font-mono-ui text-lg font-bold">{shortMoney(project.value)}</p></div><div><p className="text-xs text-muted-foreground">Estimated cost</p><p className="mt-1 font-mono-ui text-lg font-bold">{shortMoney(project.cost)}</p></div><div><p className="text-xs text-muted-foreground">Margin</p><p className="mt-1 font-mono-ui text-lg font-bold text-secondary">{project.margin.toFixed(1)}%</p></div><div><p className="text-xs text-muted-foreground">Project manager</p><p className="mt-1 flex items-center gap-1.5 text-sm font-semibold"><UserRound size={14} className="text-muted-foreground" />{project.manager || 'Unassigned'}</p></div></div></div><div className="flex overflow-x-auto border-b border-border px-4 sm:px-6">{['overview', 'boqs', 'quotations', 'activity'].map((item) => <button data-testid={`button-project-tab-${item}`} key={item} onClick={() => setTab(item)} className={`relative whitespace-nowrap px-4 py-4 text-sm font-bold capitalize ${tab === item ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{item === 'boqs' ? 'BOQs' : item}{tab === item ? <span className="absolute inset-x-4 bottom-0 h-0.5 bg-primary" /> : null}</button>)}</div>{tab === 'overview' ? <ProjectOverview project={project} /> : tab === 'boqs' ? <ProjectBoqs project={project} /> : tab === 'quotations' ? <ProjectQuotations project={project} /> : <div className="p-6 sm:p-8"><ActivityFeed items={project.activity} limit={20} /></div>}</div></div>;
}

function ProjectOverview({ project }: { project: ProjectDetail }) {
  return <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.25fr_.75fr]"><div><div className="mb-4 flex items-center justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-muted-foreground">Commercial summary</p><h3 className="mt-1 text-lg font-bold">Cost position</h3></div><span className="font-mono-ui text-[10px] uppercase text-muted-foreground">Updated {dateLabel(project.updatedAt)}</span></div><div className="border border-border"><div className="flex items-end justify-between border-b border-border bg-muted/45 p-5"><div><p className="text-xs text-muted-foreground">Value committed</p><p className="mt-1 font-mono-ui text-2xl font-bold">{money(project.value)}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Cost to date</p><p className="mt-1 font-mono-ui text-lg font-bold">{money(project.cost)}</p></div></div><div className="space-y-4 p-5"><div className="flex items-center justify-between text-xs"><span className="font-semibold">Cost utilisation</span><span className="font-mono-ui text-secondary">{project.value ? ((project.cost / project.value) * 100).toFixed(1) : '0.0'}%</span></div><div className="h-2 bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(project.value ? (project.cost / project.value) * 100 : 0, 100)}%` }} /></div><div className="grid grid-cols-2 gap-3 pt-2"><div className="bg-accent p-3"><p className="text-[11px] text-muted-foreground">Gross margin</p><p className="mt-1 font-mono-ui font-bold text-secondary">{money(project.value - project.cost)}</p></div><div className="bg-muted p-3"><p className="text-[11px] text-muted-foreground">Last review</p><p className="mt-1 font-mono-ui text-xs font-bold">{dateLabel(project.updatedAt)}</p></div></div></div></div></div><div><p className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-muted-foreground">At a glance</p><h3 className="mt-1 text-lg font-bold">Working files</h3><div className="mt-4 space-y-2">{[{ label: 'BOQ versions', value: project.boqs?.length || 0, icon: ClipboardList }, { label: 'Quotations received', value: project.quotations?.length || 0, icon: FileText }, { label: 'Activity entries', value: project.activity?.length || 0, icon: ActivityIcon }].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center justify-between border border-border p-4"><span className="flex items-center gap-3 text-sm font-semibold"><Icon size={17} className="text-secondary" />{label}</span><span className="font-mono-ui text-lg font-bold">{value}</span></div>)}</div></div></div>;
}

function ProjectBoqs({ project }: { project: ProjectDetail }) {
  return <div className="p-6 sm:p-8"><div className="mb-4 flex items-end justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-muted-foreground">Cost schedules</p><h3 className="mt-1 text-lg font-bold">BOQ versions</h3></div><Link href="/boqs" data-testid="link-manage-boqs" className="text-xs font-bold text-secondary hover:underline">Manage BOQs <ArrowUpRight className="inline" size={13} /></Link></div>{project.boqs?.length ? <div className="divide-y divide-border border border-border">{project.boqs.map((boq) => <div data-testid={`project-boq-${boq.id}`} key={boq.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"><div><p className="font-mono-ui text-xs font-bold text-secondary">{boq.version}</p><p className="mt-1 text-sm font-semibold">{boq.itemCount} line items</p></div><div className="flex items-center gap-7"><div><p className="text-[11px] text-muted-foreground">Total</p><p className="font-mono-ui text-sm font-bold">{money(boq.total)}</p></div><StatusPill value={boq.status} /></div></div>)}</div> : <EmptyState icon={ClipboardList} title="No BOQ versions yet" copy="Create a working bill of quantities for this project from the BOQ register." action={<Link href="/boqs" data-testid="link-create-project-boq" className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground"><Plus size={15} /> Create BOQ</Link>} />}</div>;
}

function ProjectQuotations({ project }: { project: ProjectDetail }) {
  return <div className="p-6 sm:p-8"><div className="mb-4 flex items-end justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-muted-foreground">Vendor responses</p><h3 className="mt-1 text-lg font-bold">Quotations</h3></div><Link href="/quotations" data-testid="link-manage-quotations" className="text-xs font-bold text-secondary hover:underline">Open collection <ArrowUpRight className="inline" size={13} /></Link></div>{project.quotations?.length ? <div className="overflow-x-auto border border-border"><table className="w-full min-w-[640px] text-left"><thead className="bg-muted/60 font-mono-ui text-[10px] uppercase tracking-[.1em] text-muted-foreground"><tr><th className="px-4 py-3 font-normal">Vendor</th><th className="px-4 py-3 font-normal">Reference</th><th className="px-4 py-3 font-normal">Total</th><th className="px-4 py-3 font-normal">Status</th></tr></thead><tbody>{project.quotations.map((quote) => <tr key={quote.id} data-testid={`project-quotation-${quote.id}`} className="border-t border-border"><td className="px-4 py-4 text-sm font-semibold">{quote.vendor}</td><td className="px-4 py-4 font-mono-ui text-xs text-muted-foreground">{quote.number}</td><td className="px-4 py-4 font-mono-ui text-xs font-bold">{money(quote.total)}</td><td className="px-4 py-4"><StatusPill value={quote.status} /></td></tr>)}</tbody></table></div> : <EmptyState icon={FileText} title="No quotations collected" copy="Record vendor responses as they arrive so the commercial trail stays complete." />}</div>;
}

function DetailSkeleton() { return <div className="space-y-5"><Skeleton className="h-4 w-40" /><div className="border border-border bg-card p-8"><Skeleton className="h-12 w-72" /><Skeleton className="mt-8 h-20 w-full" /></div></div>; }
function ListSkeleton() { return <div className="space-y-2 border border-border bg-card p-5">{[1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-14 w-full" />)}</div>; }

function BoqsPage() {
  const [projectFilter, setProjectFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showItem, setShowItem] = useState<Boq | null>(null);
  const boqsQuery = useListBoqs({ projectId: projectFilter ? Number(projectFilter) : undefined });
  const projectsQuery = useListProjects();
  const boqs = boqsQuery.data as Boq[] | undefined;
  const projects = projectsQuery.data as Project[] | undefined;
  const total = useMemo(() => boqs?.reduce((sum, boq) => sum + boq.total, 0) || 0, [boqs]);
  return <div className="animate-in"><SectionHeading eyebrow="Cost schedules" title="BOQ register" copy="Versioned quantities and rates, ready for commercial review." action={<Button data-testid="button-open-create-boq" onClick={() => setShowCreate(true)}><Plus size={16} /> New BOQ</Button>} /><div className="mb-5 flex flex-wrap items-center gap-3"><select data-testid="select-boq-project" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="h-10 min-w-[210px] border border-input bg-card px-3 text-sm"><option value="">All projects</option>{projects?.map((project) => <option key={project.id} value={project.id}>{project.code} / {project.name}</option>)}</select><span className="ml-auto font-mono-ui text-xs text-muted-foreground">Register total <strong className="text-foreground">{money(total)}</strong></span></div>{boqsQuery.isLoading ? <ListSkeleton /> : boqsQuery.isError ? <PageError retry={() => boqsQuery.refetch()} /> : boqs?.length ? <div className="overflow-x-auto border border-card-border bg-card shadow-panel"><table className="w-full min-w-[750px] text-left"><thead className="bg-muted/65 font-mono-ui text-[10px] uppercase tracking-[.12em] text-muted-foreground"><tr><th className="px-5 py-3 font-normal">Version / project</th><th className="px-3 py-3 font-normal">Status</th><th className="px-3 py-3 font-normal">Items</th><th className="px-3 py-3 font-normal">Total</th><th className="px-5 py-3 font-normal">Updated</th><th className="px-5 py-3 font-normal" /></tr></thead><tbody>{boqs.map((boq) => <tr data-testid={`row-boq-${boq.id}`} key={boq.id} className="border-t border-border hover:bg-muted/45"><td className="px-5 py-4"><p className="font-mono-ui text-xs font-bold text-secondary">{boq.version}</p><p className="mt-1 text-sm font-semibold">{boq.projectName}</p></td><td className="px-3 py-4"><StatusPill value={boq.status} /></td><td className="px-3 py-4 font-mono-ui text-xs">{boq.itemCount}</td><td className="px-3 py-4 font-mono-ui text-xs font-bold">{money(boq.total)}</td><td className="px-5 py-4 font-mono-ui text-[10px] text-muted-foreground">{dateLabel(boq.updatedAt)}</td><td className="px-5 py-4 text-right"><Button data-testid={`button-add-item-${boq.id}`} onClick={() => setShowItem(boq)} variant="quiet" className="px-2.5 text-secondary"><Plus size={15} /> Item</Button></td></tr>)}</tbody></table></div> : <EmptyState icon={ClipboardList} title="No BOQs in this view" copy="Start a cost schedule against a project. You can add line items as rates are confirmed." action={<Button data-testid="button-empty-create-boq" onClick={() => setShowCreate(true)}><Plus size={15} /> New BOQ</Button>} />}{showCreate ? <CreateBoqModal projects={projects || []} onClose={() => setShowCreate(false)} /> : null}{showItem ? <AddBoqItemModal boq={showItem} onClose={() => setShowItem(null)} /> : null}</div>;
}

function CreateBoqModal({ projects, onClose }: { projects: Project[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useCreateBoq();
  const [projectId, setProjectId] = useState(projects[0]?.id ? String(projects[0].id) : '');
  const [notes, setNotes] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!projectId) return; mutation.mutate({ data: { projectId: Number(projectId), notes } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListBoqsQueryKey() }); onClose(); } }); };
  return <Modal title="Create BOQ version" eyebrow="Cost schedule / new version" onClose={onClose}><form onSubmit={submit} className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold">Project</span><select data-testid="select-boq-project-modal" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-secondary">{projects.length ? projects.map((project) => <option key={project.id} value={project.id}>{project.code} / {project.name}</option>) : <option value="">No projects available</option>}</select></label>{projects.length ? <p className="-mt-2 text-[11px] text-muted-foreground">The first version will be created in draft status.</p> : <p className="text-sm text-destructive">Create a project before starting a BOQ.</p>}<label className="block"><span className="mb-1.5 block text-xs font-bold">Working notes</span><textarea data-testid="input-boq-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Scope notes, exclusions or revision context" className="min-h-24 w-full resize-y border border-input bg-background p-3 text-sm outline-none focus:border-secondary" /></label><div className="flex justify-end gap-2 border-t border-border pt-5"><Button type="button" variant="outline" data-testid="button-cancel-boq" onClick={onClose}>Cancel</Button><Button type="submit" data-testid="button-submit-boq" disabled={mutation.isPending || !projectId}>{mutation.isPending ? 'Creating…' : 'Create BOQ'}</Button></div></form></Modal>;
}

function AddBoqItemModal({ boq, onClose }: { boq: Boq; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useAddBoqItem();
  const [items, setItems] = useState<BoqItem[]>([]);
  const [form, setForm] = useState({ code: '', description: '', specification: '', category: 'General', quantity: '1', unit: 'No.', materialRate: '', labourRate: '', vendor: '', remarks: '' });
  const update = (key: keyof typeof form) => (value: string) => setForm((old) => ({ ...old, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ id: boq.id, data: { ...form, quantity: Number(form.quantity), materialRate: Number(form.materialRate), labourRate: Number(form.labourRate) } }, { onSuccess: (item) => { setItems((old) => [...old, item]); queryClient.invalidateQueries({ queryKey: getListBoqsQueryKey() }); setForm({ code: '', description: '', specification: '', category: 'General', quantity: '1', unit: 'No.', materialRate: '', labourRate: '', vendor: '', remarks: '' }); } }); };
  return <Modal title={`Add item to ${boq.version}`} eyebrow={`${boq.projectName} / line item`} onClose={onClose}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-[.6fr_1.4fr]"><Field label="Item code" name="boq-item-code" value={form.code} onChange={update('code')} required placeholder="A-001" /><Field label="Description" name="boq-item-description" value={form.description} onChange={update('description')} required placeholder="Joinery, stone, hardware…" /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Specification" name="boq-item-specification" value={form.specification} onChange={update('specification')} placeholder="Grade / finish / brand" /><Field label="Category" name="boq-item-category" value={form.category} onChange={update('category')} placeholder="Category" /></div><div className="grid gap-4 sm:grid-cols-3"><Field label="Quantity" name="boq-item-quantity" type="number" value={form.quantity} onChange={update('quantity')} required /><Field label="Unit" name="boq-item-unit" value={form.unit} onChange={update('unit')} required /><Field label="Vendor" name="boq-item-vendor" value={form.vendor} onChange={update('vendor')} /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Material rate" name="boq-item-material-rate" type="number" value={form.materialRate} onChange={update('materialRate')} required /><Field label="Labour rate" name="boq-item-labour-rate" type="number" value={form.labourRate} onChange={update('labourRate')} required /></div><Field label="Remarks" name="boq-item-remarks" value={form.remarks} onChange={update('remarks')} placeholder="Commercial notes" />{mutation.isError ? <p className="text-sm text-destructive">Could not add this line item. Try again.</p> : null}<div className="flex justify-end border-t border-border pt-5"><Button type="submit" data-testid="button-submit-boq-item" disabled={mutation.isPending}>{mutation.isPending ? 'Adding…' : 'Add line item'}</Button></div></form>{items.length ? <div className="mt-6 border-t border-border pt-5"><p className="mb-3 font-mono-ui text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">Added this session</p>{items.map((item) => <div key={item.id} data-testid={`added-boq-item-${item.id}`} className="flex items-center justify-between border-b border-border py-2.5 text-xs"><span><strong>{item.code}</strong> / {item.description}</span><span className="font-mono-ui">{money(item.amount)}</span></div>)}</div> : null}</Modal>;
}

function VendorsPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const query = useListVendors();
  const vendors = query.data as Vendor[] | undefined;
  const filtered = vendors?.filter((vendor) => `${vendor.name} ${vendor.company} ${vendor.category}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="animate-in"><SectionHeading eyebrow="Supply network" title="Vendors" copy="The people behind the rate. Keep contacts and commercial confidence close." action={<Button data-testid="button-open-create-vendor" onClick={() => setShowCreate(true)}><Plus size={16} /> Add vendor</Button>} /><div className="mb-5 flex max-w-lg items-center gap-2 border border-input bg-card px-3"><Search size={16} className="text-muted-foreground" /><input data-testid="input-vendor-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendors, companies or category" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>{query.isLoading ? <ListSkeleton /> : query.isError ? <PageError retry={() => query.refetch()} /> : filtered?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((vendor) => <div data-testid={`card-vendor-${vendor.id}`} key={vendor.id} className="hover-lift border border-card-border bg-card p-5 shadow-panel"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center bg-accent font-mono-ui text-xs font-bold text-secondary">{initials(vendor.company || vendor.name)}</span><div><h3 className="text-sm font-bold">{vendor.name}</h3><p className="mt-0.5 text-xs text-muted-foreground">{vendor.company}</p></div></div><StatusPill value={vendor.active ? 'Active' : 'Inactive'} /></div><div className="mt-5 border-t border-border pt-4"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Category</span><span className="font-semibold">{vendor.category}</span></div><div className="mt-3 flex items-center justify-between text-xs"><span className="text-muted-foreground">Rating</span><span className="font-mono-ui font-bold text-secondary">{vendor.rating.toFixed(1)} / 5</span></div><div className="mt-4 flex gap-2 text-xs text-muted-foreground">{vendor.phone ? <span>{vendor.phone}</span> : null}{vendor.email ? <span className="truncate">{vendor.email}</span> : null}</div></div></div>)}</div> : <EmptyState icon={Users} title="No vendors found" copy="Add the trusted fabricators, suppliers and specialists your projects depend on." action={<Button data-testid="button-empty-create-vendor" onClick={() => setShowCreate(true)}><Plus size={15} /> Add vendor</Button>} />}{showCreate ? <CreateVendorModal onClose={() => setShowCreate(false)} /> : null}</div>;
}

function CreateVendorModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useCreateVendor();
  const [form, setForm] = useState({ name: '', company: '', category: 'Joinery', phone: '', email: '' });
  const update = (key: keyof typeof form) => (value: string) => setForm((old) => ({ ...old, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ data: form }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() }); onClose(); } }); };
  return <Modal title="Add vendor" eyebrow="Supply network / new record" onClose={onClose}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Contact name" name="vendor-name" value={form.name} onChange={update('name')} required placeholder="Primary contact" /><Field label="Company" name="vendor-company" value={form.company} onChange={update('company')} required placeholder="Registered company" /></div><SelectField label="Category" name="vendor-category" value={form.category} onChange={update('category')} options={['Joinery', 'Stone', 'Metal', 'Electrical', 'Paint', 'Soft furnishings', 'Hardware', 'Other']} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" name="vendor-phone" value={form.phone} onChange={update('phone')} placeholder="+91…" /><Field label="Email" name="vendor-email" type="email" value={form.email} onChange={update('email')} placeholder="team@company.com" /></div>{mutation.isError ? <p className="text-sm text-destructive">Vendor could not be added. Please try again.</p> : null}<div className="flex justify-end gap-2 border-t border-border pt-5"><Button type="button" variant="outline" data-testid="button-cancel-vendor" onClick={onClose}>Cancel</Button><Button type="submit" data-testid="button-submit-vendor" disabled={mutation.isPending}>{mutation.isPending ? 'Adding…' : 'Add vendor'}</Button></div></form></Modal>;
}

function QuotationsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const query = useListQuotations();
  const quotes = query.data as Quotation[] | undefined;
  const summary = quotes?.reduce((acc, quote) => { const key = quote.status.toLowerCase(); if (key.includes('pending')) acc.pending += 1; else if (key.includes('review')) acc.review += 1; else acc.received += 1; return acc; }, { pending: 0, review: 0, received: 0 });
  return <div className="animate-in"><SectionHeading eyebrow="Vendor responses" title="Quotations" copy="Collect, validate and keep every response traceable." action={<Button data-testid="button-open-create-quotation" onClick={() => setShowCreate(true)}><Plus size={16} /> Record quotation</Button>} /><div className="mb-6 grid gap-3 sm:grid-cols-3">{[{ label: 'Pending', value: summary?.pending || 0, icon: Clock3 }, { label: 'In review', value: summary?.review || 0, icon: FileBarChart }, { label: 'Received', value: summary?.received || 0, icon: CheckCircle2 }].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center justify-between border border-border bg-card p-4 shadow-panel"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-muted-foreground"><Icon size={16} className="text-secondary" />{label}</span><span className="font-mono-ui text-xl font-bold">{value}</span></div>)}</div>{query.isLoading ? <ListSkeleton /> : query.isError ? <PageError retry={() => query.refetch()} /> : quotes?.length ? <div className="overflow-x-auto border border-card-border bg-card shadow-panel"><table className="w-full min-w-[900px] text-left"><thead className="bg-muted/65 font-mono-ui text-[10px] uppercase tracking-[.12em] text-muted-foreground"><tr><th className="px-5 py-3 font-normal">Vendor / project</th><th className="px-3 py-3 font-normal">Reference</th><th className="px-3 py-3 font-normal">Submitted</th><th className="px-3 py-3 font-normal">Total</th><th className="px-3 py-3 font-normal">Validity</th><th className="px-3 py-3 font-normal">Lead time</th><th className="px-5 py-3 font-normal">Status</th></tr></thead><tbody>{quotes.map((quote) => <tr data-testid={`row-quotation-${quote.id}`} key={quote.id} className="border-t border-border hover:bg-muted/45"><td className="px-5 py-4"><p className="text-sm font-bold">{quote.vendor}</p><p className="mt-1 text-xs text-muted-foreground">{quote.project}</p></td><td className="px-3 py-4 font-mono-ui text-xs">{quote.number}</td><td className="px-3 py-4 font-mono-ui text-[10px] text-muted-foreground">{dateLabel(quote.date)}</td><td className="px-3 py-4 font-mono-ui text-xs font-bold">{money(quote.total)}</td><td className="px-3 py-4 text-xs">{quote.validity || '—'}</td><td className="px-3 py-4 text-xs">{quote.leadTime || '—'}</td><td className="px-5 py-4"><StatusPill value={quote.status} /></td></tr>)}</tbody></table></div> : <EmptyState icon={FileText} title="No quotations recorded" copy="Keep vendor returns in one register for a clean comparison trail." action={<Button data-testid="button-empty-create-quotation" onClick={() => setShowCreate(true)}><Plus size={15} /> Record quotation</Button>} />}{showCreate ? <CreateQuotationModal onClose={() => setShowCreate(false)} /> : null}</div>;
}

function CreateQuotationModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useCreateQuotation();
  const [form, setForm] = useState({ vendor: '', project: '', number: '', total: '', validity: '', leadTime: '' });
  const update = (key: keyof typeof form) => (value: string) => setForm((old) => ({ ...old, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ data: { ...form, total: Number(form.total) } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListQuotationsQueryKey() }); onClose(); } }); };
  return <Modal title="Record quotation" eyebrow="Vendor response / new record" onClose={onClose}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Vendor" name="quotation-vendor" value={form.vendor} onChange={update('vendor')} required placeholder="Company name" /><Field label="Project" name="quotation-project" value={form.project} onChange={update('project')} required placeholder="Project code or name" /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Quotation number" name="quotation-number" value={form.number} onChange={update('number')} required placeholder="QTN-2406-001" /><Field label="Total amount" name="quotation-total" type="number" value={form.total} onChange={update('total')} required placeholder="₹ value" /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Validity" name="quotation-validity" value={form.validity} onChange={update('validity')} placeholder="30 days" /><Field label="Lead time" name="quotation-lead-time" value={form.leadTime} onChange={update('leadTime')} placeholder="6 weeks" /></div>{mutation.isError ? <p className="text-sm text-destructive">Quotation could not be recorded. Please try again.</p> : null}<div className="flex justify-end gap-2 border-t border-border pt-5"><Button type="button" variant="outline" data-testid="button-cancel-quotation" onClick={onClose}>Cancel</Button><Button type="submit" data-testid="button-submit-quotation" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Record quotation'}</Button></div></form></Modal>;
}

function ComparativesPage() {
  const query = useListComparisons();
  const comparisons = query.data as Comparison[] | undefined;
  const [expandedId, setExpandedId] = useState<number | null>(null);
  return <div className="animate-in"><SectionHeading eyebrow="Commercial review" title="Comparatives" copy="See the spread. Make the call. Nothing is auto-selected." />{query.isLoading ? <ListSkeleton /> : query.isError ? <PageError retry={() => query.refetch()} /> : comparisons?.length ? <div className="space-y-3">{comparisons.map((comparison) => <div data-testid={`card-comparison-${comparison.id}`} key={comparison.id} className="hover-lift border border-card-border bg-card p-5 shadow-panel sm:p-6"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center bg-accent text-secondary"><BarChart3 size={19} /></span><div><div className="flex flex-wrap items-center gap-3"><h3 className="text-base font-bold">{comparison.project}</h3><StatusPill value={comparison.status} /></div><p className="mt-1 font-mono-ui text-[10px] uppercase tracking-[.1em] text-muted-foreground">{comparison.boq} / {comparison.vendors} valid vendor responses</p></div></div><div className="flex items-center gap-5 lg:gap-8"><div><p className="text-[11px] text-muted-foreground">Lowest valid quote</p><p data-testid={`text-comparison-lowest-${comparison.id}`} className="mt-1 font-mono-ui text-xl font-bold text-secondary">{money(comparison.lowest)}</p></div><div className="hidden text-right sm:block"><p className="text-[11px] text-muted-foreground">Updated</p><p className="mt-1 font-mono-ui text-[10px] font-bold">{dateLabel(comparison.updatedAt)}</p></div><Button data-testid={`button-open-comparison-${comparison.id}`} onClick={() => setExpandedId((old) => old === comparison.id ? null : comparison.id)} variant="outline" className="px-2.5"><ChevronRight size={16} className={expandedId === comparison.id ? 'rotate-90 transition-transform' : 'transition-transform'} /></Button></div></div><div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><ShieldCheck size={14} className="text-secondary" /> Lowest valid quote is highlighted for review; award decision remains with the commercial team.</div>{expandedId === comparison.id ? <div data-testid={`comparison-review-${comparison.id}`} className="mt-4 border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.08)] p-4 text-xs leading-5 text-foreground">Review the {comparison.vendors} valid responses against the {comparison.boq} scope. The lowest valid quote is shown for reference only; record the award decision with the commercial team.</div> : null}</div>)}</div> : <EmptyState icon={BarChart3} title="No comparatives ready" copy="Once vendor quotations are collected against a BOQ, the comparison register will appear here." />}</div>;
}

function NotFound() { return <div className="flex min-h-[60dvh] items-center justify-center text-center"><div><p className="font-mono-ui text-5xl font-bold text-primary">404</p><h2 className="mt-3 text-2xl font-bold">This control view does not exist</h2><p className="mt-2 text-sm text-muted-foreground">Return to the project book and pick a live register.</p><Link data-testid="link-not-found-home" href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-secondary hover:underline">Back to overview <ArrowUpRight size={15} /></Link></div></div>; }

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppShell><Switch><Route path="/" component={DashboardPage} /><Route path="/projects" component={ProjectsPage} /><Route path="/projects/:id" component={ProjectDetailPage} /><Route path="/boqs" component={BoqsPage} /><Route path="/vendors" component={VendorsPage} /><Route path="/quotations" component={QuotationsPage} /><Route path="/comparatives" component={ComparativesPage} /><Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;