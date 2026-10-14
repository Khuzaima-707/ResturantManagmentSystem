import React, { useState, useMemo, useEffect } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BellRing,
  Volume2,
  VolumeX,
  Filter,
  Check,
  UtensilsCrossed,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../utils/cn';

export function KitchenPage() {
  const { orders, updateOrderKitchenStatus } = useAppStore();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'preparing' | 'ready' | 'all'
  const [orderTypeFilter, setOrderTypeFilter] = useState('All'); // 'All' | 'Dine-In' | 'Takeaway'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Real-time ticking clock for elapsed order timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 15000); // update every 15s
    return () => clearInterval(timer);
  }, []);

  // Filter valid completed non-reversed orders
  const kitchenOrders = useMemo(() => {
    return (orders || []).filter((o) => o.status === 'completed');
  }, [orders]);

  // Status buckets
  const ordersByStatus = useMemo(() => {
    const received = kitchenOrders.filter((o) => !o.kitchenStatus || o.kitchenStatus === 'received');
    const preparing = kitchenOrders.filter((o) => o.kitchenStatus === 'preparing');
    const ready = kitchenOrders.filter((o) => o.kitchenStatus === 'ready');
    const served = kitchenOrders.filter((o) => o.kitchenStatus === 'served');
    return { received, preparing, ready, served };
  }, [kitchenOrders]);

  // Filtered tickets based on selected tab and order type
  const displayedOrders = useMemo(() => {
    let list = [];
    if (activeTab === 'active') {
      list = [...ordersByStatus.received, ...ordersByStatus.preparing];
    } else if (activeTab === 'preparing') {
      list = ordersByStatus.preparing;
    } else if (activeTab === 'ready') {
      list = ordersByStatus.ready;
    } else {
      list = kitchenOrders.slice(0, 30);
    }

    if (orderTypeFilter !== 'All') {
      list = list.filter((o) => o.orderType === orderTypeFilter);
    }

    // Sort by order time (oldest first for active cooking queues)
    return list.sort((a, b) => new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt));
  }, [activeTab, orderTypeFilter, ordersByStatus, kitchenOrders]);

  const handleNextStatus = (order) => {
    const current = order.kitchenStatus || 'received';
    let next = 'preparing';
    if (current === 'received') next = 'preparing';
    else if (current === 'preparing') next = 'ready';
    else if (current === 'ready') next = 'served';

    updateOrderKitchenStatus(order.id, next);
  };

  const calculateMinutesElapsed = (timestamp) => {
    if (!timestamp) return 0;
    const diffMs = currentTime - new Date(timestamp).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* KDS Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-[#FF5C28]" />
            Kitchen Display System (KDS)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time live order tickets, cooking queue, and kitchen preparation stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
              soundEnabled
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            )}
            title={soundEnabled ? 'Alert chimes on' : 'Alert chimes muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? 'Audio Chime ON' : 'Audio Muted'}
          </button>
        </div>
      </div>

      {/* KPI Workflow Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('active')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all',
            activeTab === 'active'
              ? 'bg-[#FF5C28] text-white border-transparent shadow-md shadow-orange-500/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider',
                activeTab === 'active' ? 'text-orange-100' : 'text-slate-400'
              )}
            >
              Active Queue
            </span>
            <Flame className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-1">
            {ordersByStatus.received.length + ordersByStatus.preparing.length}
          </div>
          <span
            className={cn(
              'text-[10px] mt-0.5 block',
              activeTab === 'active' ? 'text-orange-100' : 'text-slate-400'
            )}
          >
            {ordersByStatus.received.length} New • {ordersByStatus.preparing.length} Cooking
          </span>
        </button>

        <button
          onClick={() => setActiveTab('preparing')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all',
            activeTab === 'preparing'
              ? 'bg-amber-500 text-white border-transparent shadow-md shadow-amber-500/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider',
                activeTab === 'preparing' ? 'text-amber-100' : 'text-amber-600'
              )}
            >
              Cooking Now
            </span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-1">{ordersByStatus.preparing.length}</div>
          <span
            className={cn(
              'text-[10px] mt-0.5 block',
              activeTab === 'preparing' ? 'text-amber-100' : 'text-slate-400'
            )}
          >
            In Chef's Station
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ready')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all',
            activeTab === 'ready'
              ? 'bg-emerald-600 text-white border-transparent shadow-md shadow-emerald-600/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider',
                activeTab === 'ready' ? 'text-emerald-100' : 'text-emerald-600'
              )}
            >
              Ready to Serve
            </span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-1">{ordersByStatus.ready.length}</div>
          <span
            className={cn(
              'text-[10px] mt-0.5 block',
              activeTab === 'ready' ? 'text-emerald-100' : 'text-slate-400'
            )}
          >
            Plated & Waiting Runner
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all',
            activeTab === 'all'
              ? 'bg-slate-900 text-white border-transparent shadow-md'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-wider',
                activeTab === 'all' ? 'text-slate-200' : 'text-slate-400'
              )}
            >
              All Today
            </span>
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-1">{kitchenOrders.length}</div>
          <span
            className={cn(
              'text-[10px] mt-0.5 block',
              activeTab === 'all' ? 'text-slate-300' : 'text-slate-400'
            )}
          >
            {ordersByStatus.served.length} Served Successfully
          </span>
        </button>
      </div>

      {/* Filter Tabs & Order Type Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['active', 'preparing', 'ready', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all',
                activeTab === tab
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              {tab === 'active' ? 'Active Queue' : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Order Type:</span>
          <select
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20"
          >
            <option value="All">All Types</option>
            <option value="Dine-In">Dine-In</option>
            <option value="Takeaway">Takeaway</option>
          </select>
        </div>
      </div>

      {/* KDS Ticket Cards Grid */}
      {displayedOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs">
          <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Kitchen Ticket Queue is Clear</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            All orders have been prepared and served. Incoming POS orders will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedOrders.map((order) => {
            const status = order.kitchenStatus || 'received';
            const minutesElapsed = calculateMinutesElapsed(order.completedAt || order.createdAt);
            const isDelayed = minutesElapsed > 15;
            const isVeryDelayed = minutesElapsed > 25;

            return (
              <div
                key={order.id}
                className={cn(
                  'bg-white rounded-3xl border flex flex-col justify-between shadow-xs transition-all duration-200 overflow-hidden',
                  status === 'ready'
                    ? 'border-emerald-300/80 shadow-emerald-500/5 ring-1 ring-emerald-400/30'
                    : status === 'preparing'
                    ? 'border-amber-300/80 ring-1 ring-amber-400/30'
                    : isVeryDelayed
                    ? 'border-rose-300 shadow-rose-500/5 ring-1 ring-rose-400/30'
                    : 'border-slate-200/80'
                )}
              >
                {/* Ticket Top Header */}
                <div
                  className={cn(
                    'p-4 border-b flex items-center justify-between',
                    status === 'ready'
                      ? 'bg-emerald-50/50 border-emerald-100'
                      : status === 'preparing'
                      ? 'bg-amber-50/40 border-amber-100'
                      : isVeryDelayed
                      ? 'bg-rose-50/50 border-rose-100'
                      : 'bg-slate-50/70 border-slate-100'
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm tracking-tight">
                        #{order.invoiceNumber}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          order.orderType === 'Dine-In'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        )}
                      >
                        {order.orderType}
                      </span>
                    </div>
                    {order.tableNumber && (
                      <span className="text-xs font-bold text-slate-700 block mt-0.5">
                        {order.tableNumber}
                      </span>
                    )}
                  </div>

                  {/* Elapsed Timer */}
                  <div
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black',
                      isVeryDelayed
                        ? 'bg-rose-600 text-white animate-pulse'
                        : isDelayed
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200/70 text-slate-700'
                    )}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {minutesElapsed}m
                  </div>
                </div>

                {/* Ticket Items List */}
                <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-64">
                  {(order.lines || []).map((line, idx) => (
                    <div key={line.id || idx} className="text-xs space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-black text-[11px] shrink-0">
                            {line.quantity}
                          </span>
                          <span>{line.itemNameSnapshot || line.itemName}</span>
                        </div>
                        {line.selectedPortionLabel && (
                          <span className="text-[11px] font-medium text-slate-400">
                            ({line.selectedPortionLabel})
                          </span>
                        )}
                      </div>

                      {/* Add-ons list */}
                      {Array.isArray(line.addonSnapshots) && line.addonSnapshots.length > 0 && (
                        <div className="pl-7 text-[11px] text-slate-500 space-y-0.5">
                          {line.addonSnapshots.map((a, aidx) => (
                            <div key={a.id || aidx} className="flex items-center gap-1 text-slate-500">
                              <span className="text-orange-500">+</span>
                              <span>
                                {a.name}
                                {a.quantity && a.quantity > 1 ? (
                                  <strong className="text-orange-600 font-bold ml-1">x{a.quantity}</strong>
                                ) : null}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Line notes e.g. Less Spicy */}
                      {line.note && (
                        <div className="pl-7 text-[11px] font-bold text-amber-600 italic">
                          "{line.note}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Ticket Footer Workflow Button */}
                <div className="p-3 bg-slate-50/50 border-t border-slate-100">
                  {status === 'received' && (
                    <button
                      onClick={() => handleNextStatus(order)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      Start Cooking
                    </button>
                  )}

                  {status === 'preparing' && (
                    <button
                      onClick={() => handleNextStatus(order)}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Plated & Ready
                    </button>
                  )}

                  {status === 'ready' && (
                    <button
                      onClick={() => handleNextStatus(order)}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark Served
                    </button>
                  )}

                  {status === 'served' && (
                    <div className="text-center py-1 text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Order Completed & Served
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default KitchenPage;
