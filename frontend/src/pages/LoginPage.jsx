import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import {
  ChefHat,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  Shield,
  CreditCard,
} from 'lucide-react';
import { useAppStore } from '../store';
import { getImage } from '../services/persistence/imageStorage';
import { storage } from '../services/persistence/storage';

const DEFAULT_SYSTEM_USERS = [
  {
    id: 'user_admin',
    name: 'Admin',
    officialTitle: 'Executive Officer / Owner',
    username: 'admin',
    email: 'admin@spicehub.pk',
    role: 'admin',
    status: 'active',
    isFixedAdmin: true,
    password: '12345',
  },
  {
    id: 'user_cashier_1',
    name: 'Hamza Farooq',
    officialTitle: 'Main Counter Cashier & Billing',
    username: 'cashier',
    email: 'cashier@spicehub.pk',
    role: 'cashier',
    status: 'active',
    isActiveCashier: true,
    isFixedAdmin: false,
    password: '1234',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: 'user_cashier_2',
    name: 'Bilal Ahmed',
    officialTitle: 'Evening Shift Cashier',
    username: 'bilal.cashier',
    email: 'bilal.cashier@spicehub.pk',
    role: 'cashier',
    status: 'deactivated',
    isActiveCashier: false,
    isFixedAdmin: false,
    password: '1234',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: 'user_cashier_3',
    name: 'Amna Sheikh',
    officialTitle: 'Floor Cashier & Ordering',
    username: 'amna.sheikh',
    email: 'amna.sheikh@spicehub.pk',
    role: 'cashier',
    status: 'deactivated',
    isActiveCashier: false,
    isFixedAdmin: false,
    password: '1234',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: 'user_cashier_4',
    name: 'Zeeshan Akram',
    officialTitle: 'Weekend Counter Cashier',
    username: 'zeeshan.cashier',
    email: 'zeeshan.cashier@spicehub.pk',
    role: 'cashier',
    status: 'deactivated',
    isActiveCashier: false,
    isFixedAdmin: false,
    password: '1234',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
  },
];

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, settings } = useAppStore();

  const restaurantName = settings?.business?.name || settings?.restaurantName || 'SpiceHub';
  const tagline = settings?.business?.tagline || settings?.tagline || 'Restaurant & Grill • Point of Sale';
  const logoRef = settings?.business?.logoRef || settings?.logoRef || null;

  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadLogo() {
      if (!logoRef) {
        setLogoUrl(null);
        return;
      }
      if (logoRef.startsWith('data:') || logoRef.startsWith('blob:') || logoRef.startsWith('http://') || logoRef.startsWith('https://')) {
        setLogoUrl(logoRef);
        return;
      }
      try {
        const url = await getImage(logoRef);
        if (isMounted) setLogoUrl(url);
      } catch {
        if (isMounted) setLogoUrl(null);
      }
    }
    loadLogo();
    return () => {
      isMounted = false;
    };
  }, [logoRef]);

  // Synchronize users list with localStorage (reflects live changes from Admin Settings)
  const [usersList, setUsersList] = useState(() => {
    const saved = storage.get('rms_users_list', null);
    const userProfiles = storage.get('user_profiles', {});
    const adminSaved = userProfiles?.admin;

    if (Array.isArray(saved) && saved.length > 0) {
      if (adminSaved?.name) {
        return saved.map((u) => {
          if ((u.isFixedAdmin || u.id === 'user_admin' || u.username === 'admin') && adminSaved.name) {
            return {
              ...u,
              name: adminSaved.name,
              fullName: adminSaved.name,
              avatarUrl: adminSaved.avatarUrl !== undefined ? adminSaved.avatarUrl : u.avatarUrl,
            };
          }
          return u;
        });
      }
      return saved;
    }
    const custom = storage.get('rms_custom_users', []);
    const defaultAdmin = adminSaved?.name
      ? {
          ...DEFAULT_SYSTEM_USERS[0],
          name: adminSaved.name,
          fullName: adminSaved.name,
          avatarUrl: adminSaved.avatarUrl !== undefined ? adminSaved.avatarUrl : DEFAULT_SYSTEM_USERS[0].avatarUrl,
        }
      : DEFAULT_SYSTEM_USERS[0];
    if (Array.isArray(custom) && custom.length > 0) return [defaultAdmin, ...custom];
    return [defaultAdmin, ...DEFAULT_SYSTEM_USERS.slice(1)];
  });

  useEffect(() => {
    const handleSyncUsers = () => {
      const saved = storage.get('rms_users_list', null);
      if (Array.isArray(saved) && saved.length > 0) {
        setUsersList(saved);
      }
    };
    window.addEventListener('focus', handleSyncUsers);
    window.addEventListener('storage', handleSyncUsers);
    return () => {
      window.removeEventListener('focus', handleSyncUsers);
      window.removeEventListener('storage', handleSyncUsers);
    };
  }, []);

  // Filter only active cashiers
  const activeCashiers = useMemo(() => {
    return usersList.filter((u) => !u.isFixedAdmin && u.status === 'active');
  }, [usersList]);

  // Portal mode: 'cashier' | 'admin'
  const [portalMode, setPortalMode] = useState(() => {
    const p = searchParams.get('portal');
    if (p === 'admin') return 'admin';
    return 'cashier';
  });

  // Selected cashier for Cashier Portal
  const [selectedCashierId, setSelectedCashierId] = useState(() => {
    const activeStored = storage.get('active_cashier_id', null);
    if (activeStored && activeCashiers.some((c) => c.id === activeStored)) {
      return activeStored;
    }
    return activeCashiers[0]?.id || null;
  });

  useEffect(() => {
    if (!selectedCashierId && activeCashiers.length > 0) {
      setSelectedCashierId(activeCashiers[0].id);
    } else if (selectedCashierId && !activeCashiers.some((c) => c.id === selectedCashierId)) {
      setSelectedCashierId(activeCashiers[0]?.id || null);
    }
  }, [activeCashiers, selectedCashierId]);

  const selectedCashier = useMemo(() => {
    return activeCashiers.find((c) => c.id === selectedCashierId) || activeCashiers[0] || null;
  }, [activeCashiers, selectedCashierId]);

  // Form states
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect straight to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Handle Cashier Portal Login
  const handleCashierLogin = async (e) => {
    e?.preventDefault();
    setError('');

    if (!selectedCashier) {
      setError('No active cashier selected.');
      return;
    }
    if (!password) {
      setError(`Please enter the password for ${selectedCashier.name}`);
      return;
    }

    try {
      setIsLoading(true);
      const res = await login({
        usernameOrEmail: selectedCashier.username || selectedCashier.email,
        password,
      });
      if (res.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(res.error || 'Invalid password');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Admin Portal Login (or manual form)
  const handleAdminLogin = async (e) => {
    e?.preventDefault();
    setError('');

    const trimmedIdentifier = (usernameOrEmail || 'admin').trim();
    if (!trimmedIdentifier) {
      setError('Please enter your username or email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setIsLoading(true);
      const res = await login({ usernameOrEmail: trimmedIdentifier, password });
      if (res.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Quick Login
  const handleQuickLogin = (uname, pwd) => {
    setUsernameOrEmail(uname);
    setPassword(pwd);
    setError('');
    setIsLoading(true);
    login({ usernameOrEmail: uname, password: pwd })
      .then((res) => {
        if (res.success) {
          navigate('/dashboard', { replace: true });
        } else {
          setError(res.error || 'Quick login failed');
        }
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="h-screen w-full flex bg-[#FAF8F5] text-slate-800 antialiased overflow-hidden selection:bg-[#FF5C28] selection:text-white">
      {/* ======================================================== */}
      {/* LEFT / HERO SECTION: Brand Orange Visuals */}
      {/* ======================================================== */}
      <div className="hidden lg:flex lg:w-1/2 h-full relative bg-gradient-to-br from-[#FF5C28] via-[#F24E18] to-[#D83A06] text-white flex-col justify-between p-6 xl:p-10 select-none shadow-2xl overflow-hidden">
        {/* Subtle Decorative Background Curves & Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="food-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1.5" fill="white" />
                <path d="M10 10 L20 20 M40 10 L50 20" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#food-pattern)" />
          </svg>
        </div>

        {/* Top Brand Identity Badge */}
        <div className="relative z-10 flex items-center gap-2.5">
          {logoUrl ? (
            <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-transparent">
              <img
                src={logoUrl}
                alt="Logo"
                className="max-w-full max-h-full object-contain [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.15))] mix-blend-multiply"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
              <ChefHat className="w-5 h-5 stroke-[2.2]" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight leading-tight truncate max-w-[280px] xl:max-w-[360px]" title={restaurantName}>
              {restaurantName}
            </h1>
            <p className="text-[11px] text-orange-100 font-medium tracking-wide truncate max-w-[280px] xl:max-w-[360px]" title={tagline}>
              {tagline}
            </p>
          </div>
        </div>

        {/* Center: Hero Biryani Imagery Presentation */}
        <div className="relative z-10 my-auto py-2 flex flex-col items-center">
          {/* Main Hero Food Circle (Special Biryani) with glowing border */}
          <div className="relative">
            <div className="w-44 h-44 xl:w-52 xl:h-52 rounded-full p-2 bg-white/20 backdrop-blur-md border-2 border-white/40 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35)] transition-transform hover:scale-[1.03] duration-300">
              <img
                src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80"
                alt="Delicious Hot Chicken Biryani"
                className="w-full h-full rounded-full object-cover shadow-inner"
              />
            </div>

            {/* Floating Secondary Mini Dish Plate */}
            <div className="absolute -bottom-2 -left-4 w-18 h-18 xl:w-22 xl:h-22 rounded-full p-1 bg-white/25 backdrop-blur-md border border-white/50 shadow-xl transition-transform hover:scale-105 duration-300">
              <img
                src="https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=80"
                alt="Aromatic Desi Special"
                className="w-full h-full rounded-full object-cover"
              />
            </div>

            {/* Floating Quality / Speed Pill Badge */}
            <div className="absolute -top-2 -right-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-white/80 shadow-lg text-slate-800 text-[10px] xl:text-[11px] font-extrabold flex items-center gap-1.5 animate-bounce-subtle">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5C28]" />
              <span>Real-Time POS</span>
            </div>
          </div>

          {/* Inspiring Taglines */}
          <div className="mt-4 xl:mt-5 text-center max-w-md">
            <h2 className="text-2xl xl:text-3xl font-black tracking-tight leading-tight">
              Authentic Taste. <br />
              <span className="text-orange-200">Lightning-Fast Billing.</span>
            </h2>
            <p className="mt-2 text-xs xl:text-[13px] text-orange-100/90 leading-relaxed font-normal">
              Empowering cashiers, kitchens, and restaurant owners with unified real-time orders, receipts, and ledger analytics.
            </p>
          </div>

          {/* Key Trust Signals */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 w-full max-w-sm text-xs">
            <div className="flex items-center gap-2 bg-white/12 backdrop-blur-xs rounded-xl p-2.5 border border-white/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="font-semibold text-white text-[10.5px]">Cashier Sales Isolation</span>
            </div>
            <div className="flex items-center gap-2 bg-white/12 backdrop-blur-xs rounded-xl p-2.5 border border-white/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="font-semibold text-white text-[10.5px]">Shift Ledger Balancing</span>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/20 text-[11px] text-orange-100/80">
          <span>&copy; {new Date().getFullYear()} {restaurantName}</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-200" />
            <span className="text-[10px] xl:text-[11px] font-semibold text-white">SSL Encrypted Terminal</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT SECTION: Dual Portal Authentication Form */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-10 overflow-y-auto">
        <div className="w-full max-w-md space-y-4 my-auto">
          {/* Mobile-only Header Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-1">
            {logoUrl ? (
              <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-transparent">
                <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain mix-blend-multiply" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#FF5C28] text-white flex items-center justify-center shadow-md overflow-hidden shrink-0">
                <ChefHat className="w-5 h-5 stroke-[2.2]" />
              </div>
            )}
            <div className="min-w-0">
              <span className="font-extrabold text-base text-slate-900 block leading-tight truncate" title={restaurantName}>
                {restaurantName}
              </span>
              <span className="text-[10px] text-[#FF5C28] font-bold block truncate" title={tagline}>
                {tagline}
              </span>
            </div>
          </div>

          {/* Portal Switcher Tabs */}
          <div className="p-1 bg-slate-200/70 rounded-2xl flex items-center gap-1 shadow-inner/10">
            <button
              type="button"
              onClick={() => {
                setPortalMode('cashier');
                setError('');
                setPassword('');
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portalMode === 'cashier'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-[#FF5C28]" />
              <span>Cashier Portal</span>
              {activeCashiers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {activeCashiers.length} Active
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPortalMode('admin');
                setError('');
                setUsernameOrEmail('admin');
                setPassword('');
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portalMode === 'admin'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Admin Portal</span>
            </button>
          </div>

          {/* Header Title */}
          <div className="space-y-0.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {portalMode === 'cashier' ? 'Cashier Terminal Access' : 'Administrator Login'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {portalMode === 'cashier'
                ? activeCashiers.length > 0
                  ? 'Select your active cashier account to open POS register'
                  : 'No cashiers are active. Enable cashiers in Admin Settings.'
                : 'Enter owner / management credentials to configure system'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* =================================================== */}
          {/* CASHIER PORTAL MODE */}
          {/* =================================================== */}
          {portalMode === 'cashier' && (
            <div className="space-y-3.5">
              {activeCashiers.length === 0 ? (
                /* No Cashier Active Notice */
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-800 text-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold">No Cashier is Currently Active</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                    All cashier accounts are deactivated. Log in to the Admin Portal and activate cashiers in <strong>Settings &gt; User &amp; Access Control</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPortalMode('admin');
                      setUsernameOrEmail('admin');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    Switch to Admin Portal
                  </button>
                </div>
              ) : (
                /* Active Cashiers List / Grid Selector */
                <form onSubmit={handleCashierLogin} className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        {activeCashiers.length === 1 ? 'Designated Cashier Terminal' : `Select Cashier Profile (${activeCashiers.length} Active)`}
                      </label>
                      {activeCashiers.length > 1 && (
                        <span className="text-[10px] text-slate-400 font-medium">Click to choose cashier</span>
                      )}
                    </div>

                    {/* Single Active Cashier: Clean Featured Card */}
                    {activeCashiers.length === 1 ? (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-50/90 via-amber-50/50 to-white border-2 border-[#FF5C28] shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            {activeCashiers[0].avatarUrl ? (
                              <img
                                src={activeCashiers[0].avatarUrl}
                                alt={activeCashiers[0].name}
                                className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
                                {(activeCashiers[0].name || 'C1').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900 truncate">
                                {activeCashiers[0].name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                Active Terminal
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 block truncate mt-0.5">
                              {activeCashiers[0].officialTitle || 'Counter Cashier & Billing'} • {activeCashiers[0].branch || 'All Branches'}
                            </span>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#FF5C28] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      /* Multi-Cashier Selection Grid */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {activeCashiers.map((cashier) => {
                          const isSelected = selectedCashier?.id === cashier.id;
                          return (
                            <div
                              key={cashier.id}
                              onClick={() => {
                                setSelectedCashierId(cashier.id);
                                setError('');
                              }}
                              className={`p-3 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center gap-3 text-left relative ${
                                isSelected
                                  ? 'bg-gradient-to-r from-orange-50/90 to-white border-[#FF5C28] ring-2 ring-[#FF5C28]/25 shadow-sm scale-[1.01]'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                              }`}
                            >
                              {/* Avatar */}
                              <div className="relative shrink-0">
                                {cashier.avatarUrl ? (
                                  <img
                                    src={cashier.avatarUrl}
                                    alt={cashier.name}
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                                    {(cashier.name || 'C1').slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs" />
                              </div>

                              {/* Name & Title */}
                              <div className="min-w-0 flex-1">
                                <span className="font-extrabold text-xs text-slate-900 block truncate">
                                  {cashier.name}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                                  {cashier.officialTitle || 'Cashier'}
                                </span>
                              </div>

                              {/* Selection Checkmark */}
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-[#FF5C28] text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Password Input for Selected Cashier */}
                  {selectedCashier && (
                    <div className="space-y-1.5 pt-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Security PIN for {selectedCashier.name}
                        </label>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-mono font-bold">
                          PIN: {selectedCashier.password || '1234'}
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                          <Lock className="w-4 h-4 text-slate-500" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError('');
                          }}
                          placeholder={`Enter ${selectedCashier.name.split(' ')[0]}'s password (${selectedCashier.password || '1234'})`}
                          autoFocus
                          required
                          className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20 transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remember Me */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-[#FF5C28] focus:ring-0 border-slate-300 cursor-pointer accent-[#FF5C28]"
                      />
                      <span>Remember this terminal</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !selectedCashier}
                    className="w-full h-10 rounded-xl bg-[#FF5C28] hover:bg-[#E04D1D] active:bg-[#D83F0E] text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span>Signing In...</span>
                    ) : (
                      <>
                        <span>Sign In as {selectedCashier?.name || 'Cashier'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* =================================================== */}
          {/* ADMIN PORTAL MODE */}
          {/* =================================================== */}
          {portalMode === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-3">
              {/* Username or Email Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Admin Identifier
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-slate-400 pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => {
                      setUsernameOrEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="admin or admin@spicehub.pk"
                    autoFocus
                    required
                    className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#FF5C28] focus:ring-1 focus:ring-[#FF5C28]/20 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Input with Eye Toggle */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Admin Password
                  </label>
                  <span className="text-[10px] text-slate-400">Default: 12345</span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter admin password (12345)"
                    required
                    className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#FF5C28] focus:ring-1 focus:ring-[#FF5C28]/20 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#FF5C28] focus:ring-0 border-slate-300 cursor-pointer accent-[#FF5C28]"
                  />
                  <span>Remember this terminal</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-slate-900/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Admin Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Access Credentials */}
          <div className="pt-3 border-t border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Quick 1-Click Access
            </span>
            {(() => {
              const creds = storage.get('auth_credentials', { admin: '12345', cashier: '1234' });
              const adminPwd = creds?.admin || '12345';

              return (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Admin Quick Login */}
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('admin', adminPwd)}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-orange-50/60 hover:border-orange-200 transition-colors text-left cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 group-hover:text-[#FF5C28]">
                          Admin Login
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#FF5C28]" />
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        admin / {adminPwd}
                      </span>
                    </button>

                    {/* Primary Active Cashier Quick Login */}
                    {activeCashiers.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const primary = selectedCashier || activeCashiers[0];
                          handleQuickLogin(primary.username || 'cashier', primary.password || '1234');
                        }}
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-orange-50/60 hover:border-orange-200 transition-colors text-left cursor-pointer group shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 group-hover:text-[#FF5C28] truncate" title={(selectedCashier || activeCashiers[0])?.name}>
                            {(selectedCashier || activeCashiers[0])?.name || 'Cashier Login'}
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#FF5C28] shrink-0" />
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5 truncate font-mono">
                          @{(selectedCashier || activeCashiers[0])?.username || 'cashier'} / {(selectedCashier || activeCashiers[0])?.password || '1234'}
                        </span>
                      </button>
                    ) : (
                      <div className="p-2 rounded-xl border border-dashed border-slate-200 text-center flex items-center justify-center text-[10px] text-slate-400">
                        No Cashiers Active
                      </div>
                    )}
                  </div>

                  {/* If more than 1 active cashier, display other active cashiers */}
                  {activeCashiers.length > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Other active:</span>
                      {activeCashiers
                        .filter((c) => c.id !== (selectedCashier?.id || activeCashiers[0]?.id))
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleQuickLogin(c.username || 'cashier', c.password || '1234')}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-orange-100 hover:text-[#FF5C28] text-slate-700 text-[10px] font-semibold transition-colors cursor-pointer"
                          >
                            Sign in as {c.name.split(' ')[0]}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
