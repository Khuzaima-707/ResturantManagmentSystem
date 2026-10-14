import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  Plus,
  AlertCircle,
  Coffee,
  Sparkles,
  ChevronRight,
  Filter,
  DollarSign,
  Utensils,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../utils/cn';

const ZONES = ['All Zones', 'Main Dining Hall', 'Family Section', 'Outdoor Terrace', 'Executive Lounge'];

export function TablesPage() {
  const navigate = useNavigate();
  const { tables, occupyTable, releaseTable, updateTableStatus, orders } = useAppStore();

  const [selectedZone, setSelectedZone] = useState('All Zones');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [activeModalTable, setActiveModalTable] = useState(null); // Table selected for Occupy modal
  const [guestCount, setGuestCount] = useState(2);
  const [customerName, setCustomerName] = useState('');

  // Stats calculation
  const stats = useMemo(() => {
    const total = (tables || []).length;
    const available = (tables || []).filter((t) => t.status === 'available').length;
    const occupied = (tables || []).filter((t) => t.status === 'occupied').length;
    const reserved = (tables || []).filter((t) => t.status === 'reserved').length;
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, available, occupied, reserved, rate };
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return (tables || []).filter((t) => {
      const matchZone = selectedZone === 'All Zones' || t.zone === selectedZone;
      const matchStatus = selectedStatus === 'All' || t.status === selectedStatus;
      return matchZone && matchStatus;
    });
  }, [tables, selectedZone, selectedStatus]);

  const handleOpenOccupyModal = (table) => {
    setActiveModalTable(table);
    setGuestCount(table.capacity || 2);
    setCustomerName('');
  };

  const handleOccupySubmit = (e) => {
    e.preventDefault();
    if (!activeModalTable) return;

    occupyTable(activeModalTable.id, {
      guestsCount: Number(guestCount) || 2,
      customerName: customerName.trim() || 'Dine-In Guest',
    });

    setActiveModalTable(null);
  };

  const handleVacateTable = (tableId) => {
    if (window.confirm('Mark this table as cleared and available?')) {
      releaseTable(tableId);
    }
  };

  const handleGoToPOSWithTable = (table) => {
    // If table is occupied with an invoice, find the order
    navigate('/pos');
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Utensils className="w-6 h-6 text-[#FF5C28]" />
            Table Floorplan & Seating
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time dining floorplan, seat occupancy, and table reservation management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5C28] hover:bg-[#E04B1A] text-white text-sm font-semibold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Go to POS Register
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tables</span>
          <div className="text-2xl font-black text-slate-900 mt-1.5">{stats.total}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Across 4 Dining Zones</p>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Available</span>
          <div className="text-2xl font-black text-emerald-600 mt-1.5">{stats.available}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Ready for seating</p>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF5C28]">Occupied</span>
          <div className="text-2xl font-black text-[#FF5C28] mt-1.5">{stats.occupied}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Currently dining</p>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Occupancy Rate</span>
          <div className="text-2xl font-black text-slate-900 mt-1.5">{stats.rate}%</div>
          <p className="text-[11px] text-slate-500 mt-0.5">{stats.occupied} of {stats.total} tables filled</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Zone Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {ZONES.map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all',
                selectedZone === zone
                  ? 'bg-[#FF5C28] text-white shadow-sm shadow-orange-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              {zone}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-400">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20"
          >
            <option value="All">All Statuses</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="reserved">Reserved</option>
          </select>
        </div>
      </div>

      {/* Tables Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const isOccupied = table.status === 'occupied';
          const isReserved = table.status === 'reserved';
          const isAvailable = table.status === 'available';

          return (
            <div
              key={table.id}
              className={cn(
                'bg-white rounded-3xl p-5 border transition-all duration-200 hover:shadow-md flex flex-col justify-between relative group',
                isOccupied
                  ? 'border-orange-200/80 shadow-xs bg-gradient-to-b from-orange-50/20 to-white'
                  : isReserved
                  ? 'border-indigo-200/80 bg-indigo-50/10'
                  : 'border-slate-200/80 hover:border-slate-300'
              )}
            >
              {/* Top Row: Table Name & Status Badge */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm tracking-tight shrink-0 shadow-2xs',
                        isOccupied
                          ? 'bg-[#FF5C28] text-white'
                          : isReserved
                          ? 'bg-indigo-600 text-white'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      )}
                    >
                      {table.tableNumber}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">
                        Table {table.tableNumber}
                      </h3>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{table.zone}</span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      isOccupied
                        ? 'bg-orange-100 text-orange-700'
                        : isReserved
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-emerald-100 text-emerald-700'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isOccupied ? 'bg-orange-500 animate-pulse' : isReserved ? 'bg-indigo-500' : 'bg-emerald-500'
                      )}
                    />
                    {table.status}
                  </span>
                </div>

                {/* Table Info Details */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5" /> Seating Capacity:
                    </span>
                    <span className="font-semibold text-slate-800">{table.capacity} Persons</span>
                  </div>

                  {isOccupied && (
                    <>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5" /> Guests Seated:
                        </span>
                        <span className="font-bold text-orange-600">
                          {table.guestsCount || table.capacity} Guests
                        </span>
                      </div>
                      {table.currentInvoiceNumber && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            Invoice Bill:
                          </span>
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                            #{table.currentInvoiceNumber}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                {isAvailable && (
                  <>
                    <button
                      onClick={() => handleOpenOccupyModal(table)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all"
                    >
                      Seat Guests
                    </button>
                    <button
                      onClick={() => updateTableStatus(table.id, 'reserved')}
                      className="py-2 px-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                      title="Mark Reserved"
                    >
                      Reserve
                    </button>
                  </>
                )}

                {isOccupied && (
                  <>
                    <button
                      onClick={() => handleGoToPOSWithTable(table)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#FF5C28] hover:bg-[#E04B1A] text-white text-xs font-bold transition-all shadow-xs"
                    >
                      Bill in POS
                    </button>
                    <button
                      onClick={() => handleVacateTable(table.id)}
                      className="py-2 px-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                      title="Clear / Vacate Table"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {isReserved && (
                  <>
                    <button
                      onClick={() => handleOpenOccupyModal(table)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all"
                    >
                      Check-in Guests
                    </button>
                    <button
                      onClick={() => updateTableStatus(table.id, 'available')}
                      className="py-2 px-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seat Guests Modal */}
      {activeModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Seat Guests at Table {activeModalTable.tableNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeModalTable.zone} • Max Capacity: {activeModalTable.capacity} Persons
                </p>
              </div>
              <button
                onClick={() => setActiveModalTable(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOccupySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Number of Guests Seated *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={activeModalTable.capacity + 4}
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer / Guest Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Tariq & Family"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModalTable(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#FF5C28] hover:bg-[#E04B1A] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all"
                >
                  Confirm Seating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TablesPage;
