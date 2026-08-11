import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Bell,
  Check,
  ChevronRight,
  Clipboard,
  Download,
  FileCheck2,
  FileImage,
  ImagePlus,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import { sampleProducts } from '@/data/sampleProducts';
import {
  averageHash,
  compareImages,
  getConfidence,
  generateSha256Hash,
  formatShortHash,
  HASH_GRID_SIZE,
  hammingDistance,
} from '@/utils/imageSimilarity';

type ProtectedItem = {
  id: string;
  name: string;
  image: string;
  date: string;
  time?: string;
  fullHash: string;
  hash: string;
  category: string;
  photos: number;
  status?: string;
  timestampIso?: string;
};

type AlertItem = {
  id: string;
  originalId: string;
  originalImage?: string;
  foundImage: string;
  source: string;
  match: string;
  matchValue?: number;
  confidence?: string;
  date: string;
  platform?: string;
  listingTitle?: string;
  suspectedPrice?: number;
  originalPrice?: number;
  seller?: string;
  simulated?: boolean;
};

type ComparisonResult = {
  similarity: number;
  confidence: string;
  originalImage: string;
  foundImage: string;
  platform: string;
  suspectedPrice: number;
  originalPrice: number;
  seller: string;
  detectedAt: string;
};

const queryClient = new QueryClient();
const STORAGE_KEY = 'vera-protected-items';
const ALERTS_STORAGE_KEY = 'vera-alerts';
const ALERTS_EVENT = 'vera-alerts-updated';

function formatTodayDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTodayTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

const imageData = (kind: string, a: string, b: string, c: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><filter id="grain"><feTurbulence baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .08"/></feComponentTransfer></filter></defs><rect width="900" height="900" fill="url(#g)"/><circle cx="680" cy="180" r="230" fill="${c}" opacity=".42"/><circle cx="120" cy="770" r="300" fill="#193f38" opacity=".32"/><path d="M110 660 Q230 180 470 430 T810 300" fill="none" stroke="#f7e3aa" stroke-width="18" opacity=".5"/><path d="M70 700 Q270 250 500 460 T850 380" fill="none" stroke="#f3a77d" stroke-width="5" opacity=".5"/>${kind === 'ceramic' ? '<ellipse cx="470" cy="470" rx="230" ry="125" fill="#d9c3a3" opacity=".85"/><ellipse cx="470" cy="446" rx="172" ry="78" fill="#8b9c8a" opacity=".88"/><path d="M330 446 Q470 555 610 446" fill="none" stroke="#f6ead3" stroke-width="12" opacity=".7"/>' : kind === 'jewelry' ? '<path d="M270 430 Q450 220 640 430 L540 600 Q450 690 360 600Z" fill="#f5cf83" opacity=".9"/><circle cx="454" cy="480" r="92" fill="#3e7569"/><circle cx="454" cy="480" r="54" fill="#e9b46f"/>' : '<path d="M250 240 L660 190 L700 650 L230 720Z" fill="#e6aa62" opacity=".76"/><path d="M275 280 L620 235 M260 360 L650 315 M250 445 L660 395 M240 535 L675 470 M230 625 L690 550" stroke="#e8d79d" stroke-width="13" opacity=".6"/>'}<rect width="900" height="900" filter="url(#grain)"/></svg>`)}`;

const seedItems: ProtectedItem[] = [
  {
    id: 'vera-772-x9b',
    name: 'Mosslight Pendant',
    image: imageData('jewelry', '#34645b', '#aa6f55', '#efc576'),
    date: 'Oct 24, 2023',
    time: '2:30 PM',
    fullHash: '772x9be3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852',
    hash: '772x9b...7852',
    category: 'Jewelry',
    photos: 3,
    status: 'Protected',
  },
  {
    id: 'vera-519-k2m',
    name: 'Quiet Tide Bowls',
    image: imageData('ceramic', '#b7a980', '#4e796a', '#e9d39a'),
    date: 'Oct 18, 2023',
    time: '11:15 AM',
    fullHash: '519k2me3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852',
    hash: '519k2m...7852',
    category: 'Ceramics',
    photos: 4,
    status: 'Protected',
  },
  {
    id: 'vera-304-p8q',
    name: 'Sunroom Weave',
    image: imageData('textile', '#d28e58', '#376e65', '#e9b576'),
    date: 'Oct 08, 2023',
    time: '4:45 PM',
    fullHash: '304p8qe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852',
    hash: '304p8q...7852',
    category: 'Textiles',
    photos: 2,
    status: 'Protected',
  },
  {
    id: 'vera-911-r4d',
    name: 'Fernline Earrings',
    image: imageData('jewelry', '#d1a75c', '#8b5f53', '#e3dfbe'),
    date: 'Sep 29, 2023',
    time: '9:20 AM',
    fullHash: '911r4de3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852',
    hash: '911r4d...7852',
    category: 'Jewelry',
    photos: 2,
    status: 'Protected',
  },
];

const demoItemImages = [
  imageData('ceramic', '#315e58', '#b37758', '#ebc878'),
  imageData('textile', '#7d8d72', '#3d675e', '#e4ca96'),
  imageData('jewelry', '#a46d54', '#394844', '#e9b777'),
  imageData('textile', '#c18a59', '#496c64', '#e8d09d'),
];

const demoItems: ProtectedItem[] = sampleProducts.map((product, index) => ({
  id: product.id,
  name: product.productName,
  image: demoItemImages[index],
  date: product.stolenMatch.detectedAt,
  time: '8:05 PM',
  fullHash: 'a8f31c92bd09e3e7f41a23c89b2e04d7159c4b8e21a3f59067b891a2c3d4e5f6',
  hash: 'a8f31c...92bd',
  category: 'Demo detection',
  photos: 1,
  status: 'Protected',
}));

const demoFoundImages = [
  imageData('ceramic', '#76574d', '#302f34', '#d99978'),
  imageData('textile', '#8e664e', '#344f4a', '#d8ac74'),
  imageData('jewelry', '#856151', '#302d32', '#dd9878'),
  imageData('textile', '#8b6252', '#344b48', '#d4a070'),
];

const demoAlerts: AlertItem[] = sampleProducts.map((product, index) => ({
  id: `demo-${product.id}`,
  originalId: product.id,
  originalImage: demoItemImages[index],
  foundImage: demoFoundImages[index],
  source: product.stolenMatch.platform,
  match: `${product.stolenMatch.confidence}%`,
  matchValue: product.stolenMatch.confidence,
  confidence: product.status === 'high-risk' ? 'HIGH RISK' : 'REVIEW',
  date: product.stolenMatch.detectedAt,
  platform: product.stolenMatch.platform,
  listingTitle: product.stolenMatch.listingTitle,
  suspectedPrice: product.stolenMatch.price,
  originalPrice: product.originalPrice,
  seller: product.stolenMatch.seller,
  simulated: true,
}));

function readItems(): ProtectedItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? [...JSON.parse(saved), ...seedItems, ...demoItems] : [...seedItems, ...demoItems];
  } catch {
    return [...seedItems, ...demoItems];
  }
}

function writeItems(items: ProtectedItem[]) {
  const customOnly = items.filter(
    (item) => !seedItems.some((seed) => seed.id === item.id) && !demoItems.some((demo) => demo.id === item.id)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
}

function useItems() {
  const [items, setItems] = useState<ProtectedItem[]>(readItems);
  const addItems = (newItems: ProtectedItem[]) => {
    setItems((old) => {
      const next = [...newItems, ...old];
      writeItems(next);
      return next;
    });
  };
  return { items, addItems };
}

function readAlerts(): AlertItem[] {
  try {
    const saved = localStorage.getItem(ALERTS_STORAGE_KEY);
    const persisted: AlertItem[] = saved ? JSON.parse(saved) : [];
    const savedIds = new Set(persisted.map((alert) => alert.id));
    return [...persisted, ...demoAlerts.filter((alert) => !savedIds.has(alert.id))];
  } catch {
    return demoAlerts;
  }
}

function writeAlerts(alerts: AlertItem[]) {
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new Event(ALERTS_EVENT));
}

function useAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>(readAlerts);
  useEffect(() => {
    const sync = () => setAlerts(readAlerts());
    window.addEventListener(ALERTS_EVENT, sync);
    return () => window.removeEventListener(ALERTS_EVENT, sync);
  }, []);
  const addAlert = (alert: AlertItem) => {
    setAlerts((old) => {
      const next = [alert, ...old];
      writeAlerts(next);
      return next;
    });
  };
  return { alerts, addAlert };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read image.'));
    reader.readAsDataURL(file);
  });
}

function useToastMessage() {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = (next: string) => {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 3000);
  };
  return { message, toast };
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3" data-testid="link-logo">
      <span className="vera-logo-mark">
        <ShieldCheck size={19} strokeWidth={2.2} />
      </span>
      {!compact && <span className="vera-display text-[25px] tracking-[-.04em]">VERA</span>}
    </Link>
  );
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/protect', label: 'Protect work', icon: Shield },
  { href: '/alerts', label: 'Watchlist', icon: Bell },
];

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { alerts } = useAlerts();
  const isActive = (href: string) =>
    location === href || (href === '/protect' && location.startsWith('/protect')) || (href === '/alerts' && location.startsWith('/alert'));

  return (
    <div className="vera-shell vera-noise">
      <aside className="vera-sidebar">
        <Logo />
        <div className="mt-14 mb-3 px-3 vera-eyebrow text-[hsl(40_25%_67%)]">Workspace</div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`vera-nav-link ${isActive(href) ? 'active' : ''}`}
              data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {href === '/alerts' && alerts.length > 0 && (
                <span className="ml-auto text-[10px] vera-mono opacity-70">
                  {String(alerts.length).padStart(2, '0')}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="rounded-xl p-4 mb-5 bg-[hsl(168_31%_31%)]">
            <Sparkles size={16} className="text-[hsl(var(--secondary))] mb-3" />
            <p className="text-[12px] leading-relaxed text-[hsl(40_30%_87%)]">
              Your work is worth defending. VERA keeps the proof close.
            </p>
          </div>
          <div className="flex items-center gap-3 border-t border-[hsl(var(--sidebar-border))] pt-4">
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] grid place-items-center vera-display text-sm">
              SS
            </div>
            <div>
              <div className="font-semibold text-xs">Sanyam</div>
              <div className="text-[10px] text-[hsl(40_25%_67%)]">Sanyam's Studio</div>
            </div>
            <MoreHorizontal size={17} className="ml-auto text-[hsl(40_25%_67%)]" />
          </div>
        </div>
      </aside>
      <header className="vera-mobile-header">
        <Logo />
        <button
          className="p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Open navigation"
          data-testid="button-mobile-menu"
        >
          <Menu size={20} />
        </button>
      </header>
      {mobileOpen && (
        <div className="md:hidden fixed inset-x-3 top-[68px] z-50 p-3 rounded-xl bg-[hsl(var(--sidebar))] shadow-xl">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              onClick={() => setMobileOpen(false)}
              key={href}
              href={href}
              className={`vera-nav-link ${isActive(href) ? 'active' : ''}`}
              data-testid={`link-mobile-${label.toLowerCase().replace(' ', '-')}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      )}
      <main className="vera-main">{children}</main>
      <nav className="vera-bottom-nav">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`vera-bottom-link ${isActive(href) ? 'active' : ''}`}
            data-testid={`link-bottom-${label.toLowerCase().replace(' ', '-')}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Header({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="vera-topline">
      <div>
        <div className="vera-eyebrow mb-3">{eyebrow}</div>
        <h1 className="vera-heading" data-testid="text-page-title">
          {title}
        </h1>
        <p className="vera-subheading">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Shield;
}) {
  return (
    <div className="vera-card vera-metric" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="flex justify-between items-start">
        <span className="vera-metric-label">{label}</span>
        <Icon size={17} className="text-[hsl(var(--primary))]" strokeWidth={1.7} />
      </div>
      <div className="vera-metric-value">{value}</div>
      <div className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">{note}</div>
    </div>
  );
}

function ItemCard({ item }: { item: ProtectedItem }) {
  return (
    <Link
      href={`/certificate/${item.id}`}
      className="vera-card vera-card-hover overflow-hidden block"
      data-testid={`card-protected-${item.id}`}
    >
      <div className="vera-art aspect-[1.07] relative">
        <img src={item.image} alt={item.name} />
        <span className="vera-art-badge">✓ PROTECTED</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm truncate max-w-[150px]">{item.name}</h3>
            <p className="text-[11px] mt-1 text-[hsl(var(--muted-foreground))]">
              Protected {item.date ? item.date : 'today'} {item.time ? `· ${item.time}` : ''}
            </p>
          </div>
          <ChevronRight size={15} className="mt-1 text-[hsl(var(--muted-foreground))]" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="vera-status vera-status-secured">
            <i className="vera-status-dot" /> ✓ Protected
          </span>
          <span className="vera-mono text-[9px] text-[hsl(var(--muted-foreground))]" title={item.fullHash}>
            Hash {item.hash}
          </span>
        </div>
      </div>
    </Link>
  );
}

function Dashboard() {
  const { items } = useItems();
  const { alerts } = useAlerts();

  return (
    <div className="vera-content vera-page-enter">
      <Header
        eyebrow="Tuesday, October 31"
        title="Good morning, Sanyam."
        description="A clear record of what you've made, and a quiet watch over where it travels."
        action={
          <Link href="/protect" className="vera-button vera-button-primary" data-testid="link-protect-new">
            <Shield size={16} /> Protect new work
          </Link>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-9 vera-grid-metrics">
        <Metric label="Protected works" value={String(items.length)} note="+ 2 this month" icon={ShieldCheck} />
        <Metric
          label="Photos fingerprinted"
          value={String(items.reduce((a, i) => a + i.photos, 0))}
          note="Across your studio"
          icon={FileImage}
        />
        <Metric
          label="Watchlist matches"
          value={String(alerts.length).padStart(2, '0')}
          note={alerts.length ? 'Needs your review' : 'No open matches'}
          icon={Bell}
        />
        <Metric label="Proof strength" value="Strong" note="Last checked just now" icon={Zap} />
      </div>

      {/* SECTION 1: PROTECTED WORKS ARCHIVE */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="vera-eyebrow mb-2">Your archive</div>
          <h2 className="vera-display text-2xl tracking-tight">Recently protected</h2>
        </div>
        <Link
          href="/protect"
          className="text-xs font-bold text-[hsl(var(--primary))] flex items-center gap-1"
          data-testid="link-view-all"
        >
          View all <ChevronRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {items.slice(0, 4).map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* SECTION 2: DEMO STOLEN-MATCH ALERTS SECTION */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="vera-eyebrow mb-2">Watchlist Detections</div>
            <h2 className="vera-display text-2xl tracking-tight">Stolen-Match Alerts</h2>
          </div>
          <Link
            href="/alerts"
            className="text-xs font-bold text-[hsl(var(--primary))] flex items-center gap-1"
            data-testid="link-view-all-alerts"
          >
            View all watchlist <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.slice(0, 4).map((alert) => {
            const relatedItem = items.find((i) => i.id === alert.originalId) || items[0];
            return (
              <Link
                key={alert.id}
                href={`/alert/${alert.id}`}
                className="vera-card p-4 flex gap-4 items-center vera-card-hover block cursor-pointer"
                data-testid={`card-dashboard-alert-${alert.id}`}
              >
                <div className="grid grid-cols-2 gap-1 w-28 h-20 shrink-0">
                  <div className="vera-art rounded-lg overflow-hidden relative">
                    <img src={alert.originalImage || relatedItem?.image} alt="Original product" />
                    <span className="vera-compare-label text-[8px] py-0.5 px-1">Original</span>
                  </div>
                  <div className="vera-art rounded-lg overflow-hidden relative">
                    <img src={alert.foundImage} alt="Suspected match" />
                    <span className="vera-compare-label !bg-[hsl(var(--accent))] text-[8px] py-0.5 px-1">Found</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="vera-status vera-status-review font-bold text-[10px] px-2 py-0.5">
                      <i className="vera-status-dot" /> {alert.confidence || 'HIGH RISK'}
                    </span>
                    <span className="vera-mono text-[11px] font-bold text-[hsl(var(--accent))]">{alert.match} match</span>
                  </div>
                  <h3 className="font-semibold text-sm truncate">{relatedItem?.name || alert.listingTitle}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Found on <span className="font-semibold text-[hsl(var(--foreground))]">{alert.source || alert.platform}</span> · ₹{alert.suspectedPrice || 399}
                  </p>
                </div>
                <ChevronRight size={18} className="text-[hsl(var(--muted-foreground))] shrink-0" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: RECENT ACTIVITY LEDGER */}
      <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-4">
        <section className="vera-card p-5 md:p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="vera-eyebrow mb-2">Activity ledger</div>
              <h2 className="vera-display text-2xl tracking-tight">Recent activity</h2>
            </div>
            <button
              className="p-2 rounded-lg hover:bg-[hsl(var(--muted))]"
              aria-label="More activity options"
              data-testid="button-activity-more"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="space-y-5">
            {[
              { event: 'Protection certificate issued', detail: 'Mosslight Pendant', date: '2 hours ago', Icon: ShieldCheck },
              { event: 'Image added to archive', detail: 'Quiet Tide Bowls', date: 'Oct 18, 2023', Icon: ImagePlus },
              { event: 'Watchlist scan completed', detail: '4 protected works checked', date: 'Oct 17, 2023', Icon: Search },
            ].map(({ event, detail, date, Icon }, i) => (
              <div key={event} className="flex gap-3 items-start">
                <div
                  className={`w-8 h-8 rounded-lg grid place-items-center ${
                    i === 0 ? 'bg-[hsl(var(--secondary))]' : 'bg-[hsl(var(--muted))]'
                  }`}
                >
                  <Icon size={15} className="text-[hsl(var(--primary))]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold">{event}</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">{detail}</p>
                </div>
                <time className="text-[10px] text-[hsl(var(--muted-foreground))]">{date}</time>
              </div>
            ))}
          </div>
        </section>
        <section className="vera-card p-5 md:p-6 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-0 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-16 w-52 h-52 rounded-full border border-[hsl(var(--primary-foreground)/.15)]" />
          <div className="vera-eyebrow text-[hsl(159_35%_72%)] mb-3">A note from VERA</div>
          <h2 className="vera-display text-[28px] leading-tight max-w-[250px]">The making is yours. The record should be, too.</h2>
          <p className="text-[12px] leading-relaxed text-[hsl(40_30%_84%)] mt-5 max-w-[280px]">
            Every protection creates a time-stamped certificate with SHA-256 hash proof.
          </p>
          <Link
            href="/protect"
            className="vera-button mt-7 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
            data-testid="link-note-protect"
          >
            Add to your archive <ChevronRight size={15} />
          </Link>
        </section>
      </div>
    </div>
  );
}

function Protect() {
  const [, setLocation] = useLocation();
  const { items, addItems } = useItems();
  const { addAlert } = useAlerts();
  const { message, toast } = useToastMessage();
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [originalComparison, setOriginalComparison] = useState<{ file: File; url: string } | null>(null);
  const [suspectedComparison, setSuspectedComparison] = useState<{ file: File; url: string } | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [protecting, setProtecting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const originalComparisonInputRef = useRef<HTMLInputElement>(null);
  const suspectedComparisonInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter((file) => file.type.startsWith('image/') && file.size < 10 * 1024 * 1024);
    setFiles((old) => [...old, ...valid.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    if (valid.length < Array.from(incoming).length) toast('Only image files under 10MB can be protected.');
  };

  const chooseComparisonImage = (kind: 'original' | 'suspected', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size >= 10 * 1024 * 1024) {
      toast('Choose an image file under 10MB.');
      return;
    }
    const next = { file, url: URL.createObjectURL(file) };
    if (kind === 'original') {
      if (originalComparison) URL.revokeObjectURL(originalComparison.url);
      setOriginalComparison(next);
    } else {
      if (suspectedComparison) URL.revokeObjectURL(suspectedComparison.url);
      setSuspectedComparison(next);
    }
    setComparisonResult(null);
  };

  const runComparison = async () => {
    if (!originalComparison || !suspectedComparison) {
      toast('Add both an original and suspected image first.');
      return;
    }
    setComparing(true);
    try {
      const [originalHash, suspectedHash, originalImage, foundImage] = await Promise.all([
        averageHash(originalComparison.file),
        averageHash(suspectedComparison.file),
        fileToDataUrl(originalComparison.file),
        fileToDataUrl(suspectedComparison.file),
      ]);
      const similarity = Math.round((1 - (hammingDistance(originalHash, suspectedHash) / originalHash.length)) * 100);
      const confidence = getConfidence(similarity);
      const originalId = `vera-${Date.now().toString(36)}`;
      const originalItem = {
        id: originalId,
        name: originalComparison.file.name.replace(/\.[^/.]+$/, '') || 'Compared original work',
        image: originalImage,
        date: formatTodayDate(),
        time: formatTodayTime(),
        fullHash: await generateSha256Hash(originalComparison.file),
        hash: formatShortHash(await generateSha256Hash(originalComparison.file)),
        category: 'Comparison',
        photos: 1,
        status: 'Protected',
      };
      if (!items.some((item) => item.id === originalId)) addItems([originalItem]);
      const alertId = `alert-${originalId}-${Date.now()}`;
      addAlert({
        id: alertId,
        originalId,
        originalImage,
        foundImage,
        source: 'Local image comparison',
        match: `${similarity}%`,
        matchValue: similarity,
        confidence,
        date: 'Just now',
        platform: 'Local comparison',
        seller: 'Suspected Seller',
        originalPrice: 899,
        suspectedPrice: 399,
        simulated: false,
      });
      setComparisonResult({
        similarity,
        confidence,
        originalImage,
        foundImage,
        platform: 'Local comparison',
        suspectedPrice: 399,
        originalPrice: 899,
        seller: 'Suspected Seller',
        detectedAt: 'Just now',
      });
      toast('Comparison complete. A new watchlist alert is ready.');
    } catch {
      toast('These images could not be compared. Try different image files.');
    } finally {
      setComparing(false);
    }
  };

  const protect = async () => {
    if (!files.length) {
      inputRef.current?.click();
      return;
    }
    setProtecting(true);
    try {
      const now = new Date();
      const formattedDate = formatTodayDate();
      const formattedTime = formatTodayTime();

      const primaryFile = files[0].file;
      const realSha256 = await generateSha256Hash(primaryFile);
      const shortHash = formatShortHash(realSha256);
      const dataUrl = await fileToDataUrl(primaryFile);

      const productName = primaryFile.name.replace(/\.[^/.]+$/, '') || 'Hand-Painted Blue Ceramic Mug';
      const itemId = `vera-${realSha256.slice(0, 10)}`;

      const newItem: ProtectedItem = {
        id: itemId,
        name: productName,
        image: dataUrl,
        date: formattedDate,
        time: formattedTime,
        fullHash: realSha256,
        hash: shortHash,
        category: 'Original work',
        photos: files.length,
        status: 'Protected',
        timestampIso: now.toISOString(),
      };

      addItems([newItem]);
      files.forEach(({ url }) => URL.revokeObjectURL(url));
      setFiles([]);

      // NAVIGATE DIRECTLY TO CERTIFICATE SCREEN
      setLocation(`/certificate/${newItem.id}`);
    } catch {
      toast('The photo could not be fingerprinted. Try another image.');
    } finally {
      setProtecting(false);
    }
  };

  return (
    <div className="vera-content vera-page-enter">
      <Header
        eyebrow="Protection studio"
        title="Protect your craft."
        description="Create a permanent, time-stamped record of the work behind every listing."
        action={
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--secondary))]" /> Local & private
          </div>
        }
      />
      <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-5 items-start">
        <section>
          <div
            className="vera-upload"
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) inputRef.current?.click();
            }}
            data-testid="upload-dropzone"
            style={dragging ? { borderColor: 'hsl(var(--primary))' } : undefined}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(e) => e.target.files && addFiles(e.target.files)}
              data-testid="input-photo-upload"
            />
            <div>
              <div className="vera-upload-icon">
                <Upload size={25} />
              </div>
              <h2 className="vera-display text-2xl">Bring the work in.</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                Drop product photos here, or <span className="font-bold text-[hsl(var(--primary))]">browse your files</span>
              </p>
              <div className="vera-mono text-[9px] text-[hsl(var(--muted-foreground))] mt-5 uppercase tracking-wider">
                JPG · PNG · WEBP / 10MB MAX EACH
              </div>
            </div>
          </div>
          {files.length > 0 && (
            <div className="mt-5 vera-card p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div className="vera-eyebrow">Ready to protect</div>
                  <p className="font-semibold text-sm mt-1">
                    {files.length} {files.length === 1 ? 'photo' : 'photos'} selected
                  </p>
                </div>
                <button
                  className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                  onClick={() => setFiles([])}
                  data-testid="button-remove-all"
                >
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {files.map(({ file, url }, index) => (
                  <div className="relative aspect-square rounded-lg overflow-hidden vera-art" key={`${file.name}-${index}`}>
                    <img src={url} alt={file.name} />
                    <button
                      className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] grid place-items-center"
                      onClick={() => setFiles((old) => old.filter((_, i) => i !== index))}
                      aria-label={`Remove ${file.name}`}
                      data-testid={`button-remove-photo-${index}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            className="vera-button vera-button-primary w-full mt-4 min-h-[50px]"
            disabled={protecting}
            onClick={protect}
            data-testid="button-protect-photos"
          >
            {protecting ? (
              <span className="animate-pulse">Generating SHA-256 Hash...</span>
            ) : (
              <>
                <ShieldCheck size={17} />{' '}
                {files.length
                  ? `Protect ${files.length} ${files.length === 1 ? 'photo' : 'photos'}`
                  : 'Select photo to protect'}
              </>
            )}
          </button>
        </section>
        <aside className="vera-card p-5 md:p-6">
          <div className="flex items-center gap-2 text-[hsl(var(--primary))] mb-5">
            <FileCheck2 size={17} />
            <span className="vera-eyebrow text-[hsl(var(--primary))]">How protection works</span>
          </div>
          <div className="space-y-5">
            {[
              ['01', 'Cryptographic SHA-256', 'VERA generates a deterministic SHA-256 hash directly from the uploaded file bytes.'],
              ['02', 'Timestamp', 'Your proof certificate is anchored to the exact day and time you created it.'],
              ['03', 'Stand behind it', 'Use your certificate with SHA-256 hash as legal evidence for takedown notices.'],
            ].map(([number, title, body]) => (
              <div key={number} className="flex gap-3">
                <span className="vera-mono text-[10px] text-[hsl(var(--accent))] pt-1">{number}</span>
                <div>
                  <h3 className="font-semibold text-sm">{title}</h3>
                  <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))] mt-1.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 rounded-xl bg-[hsl(var(--muted))] p-4 flex gap-3">
            <Shield size={16} className="text-[hsl(var(--primary))] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
              Your photos stay local in this browser. Cryptographic proof stays securely on your device.
            </p>
          </div>
        </aside>
      </div>

      {/* REAL IMAGE COMPARISON SECTION PRESERVED */}
      <section className="mt-8 vera-card p-5 md:p-6" data-testid="section-image-comparison">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="vera-eyebrow mb-2">Visual match check</div>
            <h2 className="vera-display text-2xl">Compare two images.</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5 max-w-xl">
              Run a private perceptual hash comparison in this browser. Nothing is uploaded or sent to an external service.
            </p>
          </div>
          <Search size={18} className="text-[hsl(var(--primary))] shrink-0 mt-1" />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { kind: 'original' as const, label: 'Original product image', selected: originalComparison, inputRef: originalComparisonInputRef },
            { kind: 'suspected' as const, label: 'Suspected copied image', selected: suspectedComparison, inputRef: suspectedComparisonInputRef },
          ].map(({ kind, label, selected, inputRef }) => (
            <div key={kind} className="rounded-xl border border-dashed border-[hsl(var(--border))] p-3">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => chooseComparisonImage(kind, event.target.files?.[0])}
              />
              <button
                className="w-full text-left"
                onClick={() => inputRef.current?.click()}
                data-testid={`button-select-${kind}-image`}
              >
                <div className="vera-eyebrow mb-2">{label}</div>
                <div className="vera-art aspect-[1.4] rounded-lg grid place-items-center">
                  {selected ? (
                    <img src={selected.url} alt={label} />
                  ) : (
                    <div className="text-center text-[hsl(var(--muted-foreground))]">
                      <ImagePlus size={22} className="mx-auto mb-2" />
                      <span className="text-xs font-semibold">Choose an image</span>
                    </div>
                  )}
                </div>
              </button>
              {selected && <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-2 truncate">{selected.file.name}</p>}
            </div>
          ))}
        </div>
        <button
          className="vera-button vera-button-primary w-full mt-4 min-h-[48px]"
          disabled={comparing || !originalComparison || !suspectedComparison}
          onClick={runComparison}
          data-testid="button-compare-images"
        >
          {comparing ? (
            <span className="animate-pulse">Comparing visual fingerprints...</span>
          ) : (
            <>
              <Search size={16} /> Compare Images
            </>
          )}
        </button>
        {comparisonResult && (
          <div className="mt-5 rounded-xl bg-[hsl(var(--muted))] p-4" data-testid="comparison-result">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="vera-eyebrow mb-1">Image Match Detected</div>
                <p className="vera-display text-3xl">
                  {comparisonResult.similarity}% <span className="text-base font-sans font-semibold tracking-normal">visual similarity</span>
                </p>
              </div>
              <span className="vera-status vera-status-review">
                <i className="vera-status-dot" /> {comparisonResult.confidence}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="vera-art aspect-square rounded-lg">
                <img src={comparisonResult.originalImage} alt="Original image used in comparison" />
                <span className="vera-compare-label">Original</span>
              </div>
              <div className="vera-art aspect-square rounded-lg">
                <img src={comparisonResult.foundImage} alt="Suspected image used in comparison" />
                <span className="vera-compare-label !bg-[hsl(var(--accent))]">Suspected</span>
              </div>
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-3">
              This result was calculated from a {HASH_GRID_SIZE} × {HASH_GRID_SIZE} grayscale average hash and Hamming distance.
            </p>
          </div>
        )}
      </section>

      <section className="mt-11">
        <div className="flex justify-between items-end mb-4">
          <div>
            <div className="vera-eyebrow mb-2">Archive</div>
            <h2 className="vera-display text-2xl">Recently protected</h2>
          </div>
          <span className="vera-mono text-[10px] text-[hsl(var(--muted-foreground))]">{items.length} RECORDS</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
      {message && <div className="vera-toast" role="status" data-testid="status-toast">{message}</div>}
    </div>
  );
}

function Certificate() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { items } = useItems();
  const { message, toast } = useToastMessage();
  const [showFullHash, setShowFullHash] = useState(false);

  const item = items.find((candidate) => candidate.id === id) || items[0];
  const fullHashStr = item.fullHash || item.hash || 'a8f31c92bd09e3e7f41a23c89b2e04d7159c4b8e21a3f59067b891a2c3d4e5f6';

  const certificateUrl = `${window.location.origin}/certificate/${item.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(certificateUrl);
      toast('Certificate link copied to clipboard.');
    } catch {
      toast('Certificate link ready to share.');
    }
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${item.name} · VERA Certificate`,
        text: 'Verified work protected with VERA.',
        url: certificateUrl,
      }).catch(() => undefined);
    } else copy();
  };

  return (
    <div className="vera-content vera-page-enter max-w-[850px]">
      <div className="flex items-center gap-3 mb-9">
        <Link href="/dashboard" className="vera-button vera-button-outline !px-3" data-testid="link-back-dashboard">
          <ChevronRight size={16} className="rotate-180" />
        </Link>
        <div>
          <div className="vera-eyebrow">Public proof record</div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            VERA / Certificate / {item.hash}
          </p>
        </div>
      </div>

      <div className="vera-certificate vera-card rounded-2xl overflow-hidden shadow-lg border border-[hsl(var(--border))]">
        <div className="grid md:grid-cols-[.95fr_1.05fr]">
          <div className="vera-art aspect-square md:aspect-auto md:min-h-[540px] relative">
            <img src={item.image} alt={`${item.name} protected work`} className="w-full h-full object-cover" />
            <div className="absolute top-5 left-5 z-10 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-md px-3 py-2 text-[11px] font-bold tracking-wider flex items-center gap-2 shadow-sm">
              <ShieldCheck size={16} /> ✓ PROTECTED
            </div>
          </div>
          <div className="p-6 md:p-9 relative z-10 flex flex-col bg-[hsl(var(--card))]">
            <div className="vera-eyebrow mb-2 text-[hsl(var(--primary))] font-bold uppercase tracking-wider">
              CERTIFICATE OF OWNERSHIP
            </div>
            <h1 className="vera-display text-3xl md:text-4xl leading-[1.05] tracking-[-.04em] mt-1" data-testid="text-certificate-name">
              {item.name}
            </h1>
            <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))] mt-3">
              Tamper-evident digital certificate recording original ownership and asset provenance.
            </p>

            <div className="mt-6 space-y-3.5 border-t border-b border-[hsl(var(--border))] py-4">
              <div className="flex justify-between items-center gap-3">
                <span className="vera-mono text-[10px] text-[hsl(var(--muted-foreground))]">STATUS</span>
                <span className="vera-status vera-status-secured text-xs font-bold">
                  <i className="vera-status-dot" /> ✓ Protected
                </span>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span className="vera-mono text-[10px] text-[hsl(var(--muted-foreground))]">ALGORITHM</span>
                <span className="vera-mono text-xs font-bold text-[hsl(var(--primary))]">SHA-256</span>
              </div>

              <div className="flex justify-between items-start gap-3">
                <span className="vera-mono text-[10px] text-[hsl(var(--muted-foreground))] pt-1">FILE HASH</span>
                <div className="text-right max-w-[200px]">
                  <div className="vera-mono text-xs font-semibold text-[hsl(var(--primary))] break-all">
                    {showFullHash ? fullHashStr : item.hash}
                  </div>
                  <button
                    onClick={() => setShowFullHash(!showFullHash)}
                    className="text-[10px] text-[hsl(var(--muted-foreground))] underline hover:text-[hsl(var(--primary))] mt-0.5"
                  >
                    {showFullHash ? 'Show shortened preview' : 'View full hash'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span className="vera-mono text-[10px] text-[hsl(var(--muted-foreground))]">CREATED / PROTECTED</span>
                <span className="text-xs font-semibold text-right" data-testid="text-certificate-date">
                  {item.date} {item.time ? `· ${item.time}` : ''}
                </span>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span className="vera-mono text-[10px] text-[hsl(var(--muted-foreground))]">RIGHTS HOLDER</span>
                <span className="text-xs font-semibold text-right">Sanyam's Studio</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setLocation('/dashboard')}
                className="vera-button vera-button-primary w-full min-h-[48px] text-sm font-bold flex items-center justify-center gap-2"
                data-testid="button-continue-dashboard"
              >
                Continue to Dashboard <ChevronRight size={16} />
              </button>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between border-t border-[hsl(var(--border)/.5)] text-[10px] text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1">
                <Check size={13} className="text-[hsl(var(--primary))]" /> Proof Verified by VERA
              </span>
              <div className="flex gap-2">
                <button onClick={copy} className="hover:text-[hsl(var(--foreground))]">Copy link</button>
                <span>·</span>
                <button onClick={share} className="hover:text-[hsl(var(--foreground))]">Share</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-5">
        <button className="vera-button vera-button-primary flex-1" onClick={share} data-testid="button-share-certificate">
          <Share2 size={16} /> Share certificate
        </button>
        <button className="vera-button vera-button-outline flex-1" onClick={copy} data-testid="button-copy-certificate">
          <Clipboard size={16} /> Copy certificate link
        </button>
      </div>

      {message && <div className="vera-toast" role="status" data-testid="status-toast">{message}</div>}
    </div>
  );
}

function Alerts() {
  const { items } = useItems();
  const { alerts } = useAlerts();
  const { message, toast } = useToastMessage();
  const [, setLocation] = useLocation();

  return (
    <div className="vera-content vera-page-enter">
      <Header
        eyebrow="Quiet watch"
        title="Worth a closer look."
        description="VERA found visual similarities to your protected work. You decide what happens next."
        action={
          <div className="vera-status vera-status-review">
            <i className="vera-status-dot" /> {alerts.length} {alerts.length === 1 ? 'review' : 'reviews'} open
          </div>
        }
      />
      {alerts.length ? (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const item = items.find((i) => i.id === alert.originalId) || items[0];
            return (
              <article
                key={alert.id}
                onClick={() => setLocation(`/alert/${alert.id}`)}
                className="vera-card p-4 md:p-5 grid md:grid-cols-[170px_1fr_auto] gap-4 items-center vera-card-hover cursor-pointer"
                data-testid={`card-alert-${alert.id}`}
              >
                <div className="grid grid-cols-2 gap-1 aspect-[2/1] md:aspect-auto md:h-[105px]">
                  <div className="vera-art rounded-lg relative">
                    <img src={alert.originalImage || item.image} alt="Original protected work" />
                    <span className="vera-compare-label">Original</span>
                  </div>
                  <div className="vera-art rounded-lg relative">
                    <img src={alert.foundImage} alt="Potential copy found online" />
                    <span className="vera-compare-label !bg-[hsl(var(--accent))]">Found</span>
                  </div>
                </div>
                <div>
                  <div className="flex gap-2 items-center mb-2">
                    <span className="vera-status vera-status-review font-bold text-xs">
                      <i className="vera-status-dot" /> {alert.confidence || 'HIGH RISK'}
                    </span>
                    <span className="vera-mono text-[11px] font-bold text-[hsl(var(--accent))]">{alert.match} match</span>
                  </div>
                  <h2 className="font-semibold text-sm">{item.name}</h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    Found on {alert.source || alert.platform} · {alert.date}
                  </p>
                </div>
                <div className="flex md:flex-col gap-2 md:min-w-[140px]">
                  <Link
                    href={`/alert/${alert.id}`}
                    className="vera-button vera-button-primary flex-1 !px-3 text-center"
                    data-testid={`button-review-alert-${alert.id}`}
                  >
                    Review match
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="vera-card p-12 text-center">
          <ShieldCheck className="mx-auto text-[hsl(var(--primary))]" size={33} />
          <h2 className="vera-display text-2xl mt-4">Nothing needs your attention.</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
            Compare two images in Protect work and VERA will keep the result here.
          </p>
        </div>
      )}
      <div className="mt-8 flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
        <Search size={14} /> Scans run against the places your work is most likely to travel.
      </div>
      {message && <div className="vera-toast" role="status" data-testid="status-toast">{message}</div>}
    </div>
  );
}

function AlertDetailScreen() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { alerts } = useAlerts();
  const { items } = useItems();
  const { message, toast } = useToastMessage();

  const alert =
    alerts.find((a) => a.id === id || a.originalId === id || a.id === `demo-${id}`) ||
    demoAlerts.find((a) => a.id === id || a.originalId === id || a.id === `demo-${id}`) ||
    demoAlerts[0];

  const item = items.find((i) => i.id === alert.originalId) || {
    id: alert.originalId || 'VERA-001',
    name: alert.listingTitle || 'Hand-Painted Blue Ceramic Mug',
    image: alert.originalImage || demoItemImages[0],
    date: alert.date,
    fullHash: 'a8f31c92bd09e3e7f41a23c89b2e04d7159c4b8e21a3f59067b891a2c3d4e5f6',
    hash: 'a8f31c...92bd',
    category: 'Original work',
    photos: 1,
  };

  const platformName = alert.platform || alert.source || 'Meesho';
  const sellerName = alert.seller || 'HomeDecor_Store';
  const origPrice = alert.originalPrice || 899;
  const suspPrice = alert.suspectedPrice || 399;
  const confidenceScore = alert.match || '97%';
  const riskLevel = alert.confidence || 'HIGH RISK';

  return (
    <div className="vera-content vera-page-enter max-w-[980px]">
      <button
        className="text-xs font-bold text-[hsl(var(--primary))] flex items-center gap-2 mb-6"
        onClick={() => setLocation('/dashboard')}
        data-testid="button-back-alert"
      >
        <ChevronRight size={14} className="rotate-180" /> Back to Dashboard
      </button>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <section className="vera-card p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="vera-eyebrow mb-1 text-[hsl(var(--primary))] font-bold">SUSPECTED MATCH REPORT</div>
              <h1 className="vera-display text-3xl font-bold">{item.name}</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Detected on {platformName} · {alert.date}
              </p>
            </div>
            <span className="vera-status vera-status-review font-bold px-3 py-1.5 text-xs">
              <i className="vera-status-dot" /> {riskLevel}
            </span>
          </div>

          {/* VISUAL COMPARISON */}
          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="space-y-2">
              <div className="vera-art aspect-square rounded-xl overflow-hidden relative border border-[hsl(var(--border))]">
                <img src={alert.originalImage || item.image} alt={`Original ${item.name}`} />
                <span className="vera-compare-label">Original Product</span>
              </div>
              <div className="p-3 rounded-lg bg-[hsl(var(--muted))] text-xs">
                <p className="font-semibold text-[hsl(var(--foreground))]">{item.name}</p>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  Original Price: <span className="font-bold text-[hsl(var(--foreground))]">₹{origPrice}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="vera-art aspect-square rounded-xl overflow-hidden relative border border-[hsl(var(--border))]">
                <img src={alert.foundImage} alt="Suspected match" />
                <span className="vera-compare-label !bg-[hsl(var(--accent))]">Suspected Match</span>
              </div>
              <div className="p-3 rounded-lg bg-[hsl(var(--muted))] text-xs">
                <p className="font-semibold text-[hsl(var(--foreground))]">{alert.listingTitle || item.name}</p>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  Suspected Price: <span className="font-bold text-[hsl(var(--accent))]">₹{suspPrice}</span>
                </p>
              </div>
            </div>
          </div>

          {/* METADATA SUMMARY */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-[hsl(var(--muted))] my-6 text-xs">
            <div>
              <span className="text-[10px] vera-mono text-[hsl(var(--muted-foreground))] block">PLATFORM</span>
              <span className="font-bold text-sm">{platformName}</span>
            </div>
            <div>
              <span className="text-[10px] vera-mono text-[hsl(var(--muted-foreground))] block">SELLER</span>
              <span className="font-bold text-sm truncate block">{sellerName}</span>
            </div>
            <div>
              <span className="text-[10px] vera-mono text-[hsl(var(--muted-foreground))] block">CONFIDENCE SCORE</span>
              <span className="font-bold text-sm text-[hsl(var(--accent))]">{confidenceScore}</span>
            </div>
            <div>
              <span className="text-[10px] vera-mono text-[hsl(var(--muted-foreground))] block">RISK LEVEL</span>
              <span className="font-bold text-sm text-[hsl(var(--destructive))]">{riskLevel}</span>
            </div>
          </div>

          <div className="vera-alert-line p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <p className="text-xs font-semibold flex items-center gap-2">
              <ShieldCheck size={16} className="text-[hsl(var(--primary))]" />
              {alert.simulated ? 'MOCK MARKETPLACE ALERT (DEMO DATA)' : 'REAL IMAGE COMPARISON RESULT'}
            </p>
            <p className="text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))] mt-1">
              {alert.simulated
                ? 'This detection is simulated marketplace demo data stored in the project database.'
                : 'This match was calculated directly using local perceptual image hashing.'}
            </p>
          </div>
        </section>

        {/* SIDEBAR ACTIONS */}
        <aside className="vera-card p-6 h-fit space-y-4">
          <div className="vera-eyebrow text-[hsl(var(--primary))] font-bold">NEXT STEP</div>
          <h3 className="vera-display text-2xl font-bold">Enforce Your Rights</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            Generate an official takedown notice pre-populated with seller details, confidence score, and proof hash.
          </p>

          <Link
            href={`/takedown/${alert.id}`}
            className="vera-button vera-button-primary w-full min-h-[50px] text-sm font-bold flex items-center justify-center gap-2"
            data-testid="button-generate-takedown-notice"
          >
            <FileCheck2 size={18} /> Generate Takedown Notice
          </Link>

          <button
            onClick={() => {
              toast('Alert metadata copied to clipboard.');
            }}
            className="vera-button vera-button-outline w-full text-xs"
          >
            <Clipboard size={14} /> Copy Match Details
          </button>
        </aside>
      </div>

      {message && <div className="vera-toast" role="status" data-testid="status-toast">{message}</div>}
    </div>
  );
}

function TakedownScreen() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { alerts } = useAlerts();
  const { items } = useItems();
  const { message, toast } = useToastMessage();
  const [copied, setCopied] = useState(false);

  const alert =
    alerts.find((a) => a.id === id || a.originalId === id || a.id === `demo-${id}`) ||
    demoAlerts.find((a) => a.id === id || a.originalId === id || a.id === `demo-${id}`) ||
    demoAlerts[0];

  const item = items.find((i) => i.id === alert.originalId) || items[0];

  const platform = alert.platform || alert.source || 'Meesho';
  const seller = alert.seller || 'HomeDecor_Store';
  const originalName = item.name || 'Hand-Painted Blue Ceramic Mug';
  const detectionDate = alert.date || '11 August 2026';
  const similarity = alert.match || '97%';
  const originalPrice = alert.originalPrice || 899;
  const suspectedPrice = alert.suspectedPrice || 399;
  const itemHash = item.fullHash || item.hash || 'a8f31c92bd09e3e7f41a23c89b2e04d7159c4b8e21a3f59067b891a2c3d4e5f6';

  const noticeText = `COPYRIGHT / IMAGE INFRINGEMENT NOTICE

To:
${platform}

Subject:
Unauthorized use of copyrighted product imagery

Hello,

I am the original creator and rights holder of the product imagery associated with:

"${originalName}"

VERA detected a suspected unauthorized use of this image on your platform.

Platform:
${platform}

Suspected seller:
${seller}

Detection date:
${detectionDate}

Image similarity:
${similarity}

Original listing price:
₹${originalPrice}

Suspected listing price:
₹${suspectedPrice}

I request that the unauthorized use of my copyrighted imagery be reviewed and removed in accordance with your applicable intellectual property policies.

Evidence available:

* Original image
* Suspected matching image
* VERA image comparison result
* Ownership/protection timestamp
* Generated image hash (${itemHash})

Please review this matter and take appropriate action.

Regards,
VERA Protected Seller`;

  const copyNotice = async () => {
    try {
      await navigator.clipboard.writeText(noticeText);
      setCopied(true);
      toast('Notice copied');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast('Notice copied');
    }
  };

  const downloadNotice = () => {
    try {
      const filename = `takedown-notice-${platform.toLowerCase().replace(/\s+/g, '-')}.txt`;
      const blob = new Blob([noticeText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast('Notice downloaded as text file');
    } catch {
      toast('Download failed');
    }
  };

  return (
    <div className="vera-content vera-page-enter max-w-[980px]">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setLocation(`/alert/${alert.id}`)}
          className="vera-button vera-button-outline !px-3"
          data-testid="button-back-to-alert"
        >
          <ChevronRight size={16} className="rotate-180" />
        </button>
        <div>
          <div className="vera-eyebrow">Takedown Generator</div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Prepared for {platform} · {seller}
          </p>
        </div>
      </div>

      <Header
        eyebrow="COPYRIGHT NOTICE"
        title="Ready to Send Takedown Notice"
        description="Dynamic copyright notice pre-filled with detection data, confidence score, pricing, and cryptographic hash."
      />

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 mt-6">
        <section className="vera-card p-6 md:p-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="vera-display text-xl font-bold">Generated Notice Body</h2>
            <span className="vera-status vera-status-secured text-xs font-bold">
              <i className="vera-status-dot" /> DYNAMIC NOTICE
            </span>
          </div>

          <div
            className="vera-notice p-5 rounded-xl bg-[hsl(var(--muted))] font-mono text-xs leading-relaxed whitespace-pre-wrap border border-[hsl(var(--border))]"
            data-testid="text-takedown-notice-content"
          >
            {noticeText}
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={copyNotice}
              className="vera-button vera-button-primary min-h-[46px] flex-1 font-bold flex items-center justify-center gap-2"
              data-testid="button-copy-notice"
            >
              {copied ? (
                <>
                  <Check size={18} /> Notice copied
                </>
              ) : (
                <>
                  <Clipboard size={18} /> Copy Notice
                </>
              )}
            </button>

            <button
              onClick={downloadNotice}
              className="vera-button vera-button-outline min-h-[46px] flex-1 font-bold flex items-center justify-center gap-2"
              data-testid="button-download-notice"
            >
              <Download size={18} /> Download Notice (.txt)
            </button>
          </div>
        </section>

        <aside className="vera-card p-6 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-0 flex flex-col justify-between">
          <div>
            <div className="vera-eyebrow text-[hsl(159_35%_72%)] mb-4 font-bold">LEGAL EVIDENCE</div>
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] grid place-items-center mb-4">
              <ShieldCheck size={34} />
            </div>
            <h3 className="vera-display text-2xl font-bold">Proof Record Attached</h3>
            <p className="text-xs leading-relaxed text-[hsl(40_30%_84%)] mt-3">
              This notice links directly to your VERA Certificate and includes your original product's SHA-256 hash.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={copyNotice}
              className="vera-button w-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] font-bold text-xs py-3"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={() => setLocation(`/alert/${alert.id}`)}
              className="w-full text-center text-xs text-[hsl(159_35%_72%)] hover:underline pt-2"
            >
              Back to Alert Details
            </button>
          </div>
        </aside>
      </div>

      {message && <div className="vera-toast" role="status" data-testid="status-toast">{message}</div>}
    </div>
  );
}

function NotFound() {
  return (
    <div className="vera-content text-center">
      <Logo />
      <div className="vera-card p-12 mt-16 max-w-md mx-auto">
        <div className="vera-eyebrow">404</div>
        <h1 className="vera-display text-4xl mt-3">That record isn't here.</h1>
        <Link href="/dashboard" className="vera-button vera-button-primary mt-6" data-testid="link-not-found-dashboard">
          Return to overview
        </Link>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <AppShell>
      <ErrorBoundary resetKey={location}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/protect" component={Protect} />
          <Route path="/certificate" component={Certificate} />
          <Route path="/certificate/:id" component={Certificate} />
          <Route path="/alerts" component={Alerts} />
          <Route path="/alert/:id" component={AlertDetailScreen} />
          <Route path="/alerts/:id" component={AlertDetailScreen} />
          <Route path="/takedown/:id" component={TakedownScreen} />
          <Route path="/protect/takedown/:id" component={TakedownScreen} />
          <Route component={NotFound} />
        </Switch>
      </ErrorBoundary>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;