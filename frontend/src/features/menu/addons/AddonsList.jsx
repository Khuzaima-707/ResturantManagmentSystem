import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Power, Search } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataTable';
import { AddonModal } from './AddonModal';
import { useAppStore } from '../../../store';
import { detectAddonCategories, ADDON_TYPES, detectAddonType } from '../../../domain/rules';
import { cn } from '../../../utils/cn';

export const AddonsList = ({ isAddModalOpen: externalAddModalOpen, onAddModalClose }) => {
  const { addons, categories, addAddon, setAddonStatus, deleteAddon, user } = useAppStore();
  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );

  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonCostPrice, setNewAddonCostPrice] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');
  const [quickError, setQuickError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState(null);

  const isModalOpen = Boolean(!isCashier && (externalAddModalOpen || internalModalOpen));
  const closeModal = () => {
    setInternalModalOpen(false);
    setSelectedAddon(null);
    onAddModalClose?.();
  };

  // Category map for lookup
  const categoryMap = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => {
      if (c && c.id) map.set(c.id, c.name || '');
    });
    return map;
  }, [categories]);

  const filteredAddons = useMemo(() => {
    const list = (addons || []).filter((addon) => {
      if (!addon) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!String(addon.name || '').toLowerCase().includes(q)) return false;
      }

      if (statusFilter !== 'All Status') {
        if (String(addon.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      return true;
    });

    // Ensure latest added / updated add-ons always appear at the top
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      const updA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const updB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (updA !== updB) return updB - updA;
      return 0;
    });
  }, [addons, searchQuery, statusFilter]);

  const handleOpenEdit = (addon) => {
    if (isCashier) return;
    setSelectedAddon(addon);
    setInternalModalOpen(true);
  };

  const handleToggleStatus = (addon) => {
    if (isCashier) return;
    const next = addon.status === 'active' ? 'inactive' : 'active';
    setAddonStatus(addon.id, next);
  };

  const handleQuickAdd = (e) => {
    e?.preventDefault();
    if (isCashier) return;
    const trimmedName = newAddonName.trim();
    const trimmedPrice = String(newAddonPrice).trim();
    const trimmedCost = String(newAddonCostPrice).trim();

    if (!trimmedName) {
      setQuickError('Addon name fill karo');
      return;
    }

    if (!trimmedPrice) {
      setQuickError('Price add karo / Fill price');
      return;
    }

    const parsedPrice = parseFloat(trimmedPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setQuickError('Valid price add karo (e.g. 50)');
      return;
    }

    setQuickError('');
    const finalType = detectAddonType(trimmedName);
    addAddon({
      name: trimmedName,
      type: finalType,
      costPrice: trimmedCost !== '' && !isNaN(Number(trimmedCost)) ? Math.round(parseFloat(trimmedCost)) : null,
      price: Math.round(parsedPrice),
      status: 'active',
      categoryIds: [],
      itemIds: [],
    });
    setNewAddonName('');
    setNewAddonCostPrice('');
    setNewAddonPrice('');
  };

  const columns = [
    {
      key: 'index',
      title: '#',
      headerClassName: 'w-12 text-center',
      align: 'center',
      render: (_, __, idx) => (
        <span className="text-xs font-semibold text-slate-400">
          {idx + 1}
        </span>
      ),
    },
    {
      key: 'name',
      title: 'Add-on Name',
      render: (val) => (
        <span className="font-bold text-xs text-slate-800">
          {val}
        </span>
      ),
    },
    {
      key: 'costPrice',
      title: 'Cost',
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
      render: (val) => (
        <span className="font-semibold text-xs text-slate-500 whitespace-nowrap">
          {val !== null && val !== undefined && val !== '' ? `Rs ${Number(val).toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      key: 'price',
      title: 'Sell Price',
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
      render: (val) => (
        <span className="font-bold text-xs text-slate-800 whitespace-nowrap">
          Rs {Number(val || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'categoryIds',
      title: 'Compatible Categories',
      align: 'center',
      headerClassName: 'text-center',
      render: (catIds) => {
        const rawList = Array.isArray(catIds) ? catIds : [];
        const list = rawList.filter((id) => {
          if (id === 'cat-biryani') return false;
          const name = String(categoryMap.get(id) || id).toLowerCase();
          return !name.includes('rice') && !name.includes('biryani');
        });
        if (!list.length) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 border border-slate-200/90 text-slate-700 shadow-2xs">
              All
            </span>
          );
        }
        if (list.length <= 2) {
          return (
            <div className="inline-flex flex-wrap items-center justify-center gap-1">
              {list.map((id) => (
                <span
                  key={id}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 border border-slate-200/90 text-slate-700 shadow-2xs"
                >
                  {categoryMap.get(id) || id}
                </span>
              ))}
            </div>
          );
        }
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 border border-slate-200/90 text-slate-700 shadow-2xs">
            {list.length} Categories
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center',
      headerClassName: 'text-center',
      render: (status) =>
        status === 'active' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            Inactive
          </span>
        ),
    },
    ...(!isCashier
      ? [
          {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            headerClassName: 'text-center w-24',
            render: (_, row) => (
              <div className="flex items-center justify-center gap-1 text-slate-400">
                {/* Edit */}
                <button
                  type="button"
                  onClick={() => handleOpenEdit(row)}
                  className="p-1 rounded-md hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Edit Add-on"
                  aria-label="Edit Add-on"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                {/* Toggle Active / Inactive */}
                <button
                  type="button"
                  onClick={() => handleToggleStatus(row)}
                  className={cn(
                    'p-1 rounded-md transition-colors cursor-pointer',
                    row.status === 'active'
                      ? 'hover:text-emerald-600 hover:bg-emerald-50'
                      : 'hover:text-slate-700 hover:bg-slate-100'
                  )}
                  title={row.status === 'active' ? 'Deactivate Add-on' : 'Activate Add-on'}
                  aria-label="Toggle Status"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>

                {/* Delete Add-on */}
                <button
                  type="button"
                  onClick={() => deleteAddon(row.id)}
                  className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Add-on"
                  aria-label="Delete Add-on"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Top Action & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left Side: Quick Add Form (Admin only) or Pill Search Input (Cashier) */}
        {!isCashier ? (
          <form onSubmit={handleQuickAdd} noValidate className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
            <input
              type="text"
              value={newAddonName}
              onChange={(e) => {
                const val = e.target.value;
                setNewAddonName(val);
                if (quickError) setQuickError('');
              }}
              placeholder="Addon name (e.g. Extra Boti, Cold Drink)"
              className={cn(
                'flex-1 min-w-[160px] px-3.5 py-1.5 bg-white border rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors',
                quickError && !newAddonName.trim()
                  ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-200'
                  : 'border-slate-200 focus:border-[#FF5C28]'
              )}
            />

            <input
              type="number"
              min="0"
              step="any"
              value={newAddonCostPrice}
              onChange={(e) => {
                setNewAddonCostPrice(e.target.value);
                if (quickError) setQuickError('');
              }}
              placeholder="Cost Price"
              className="w-28 px-3.5 py-1.5 bg-white border border-slate-200 focus:border-[#FF5C28] rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
            />

            <input
              type="number"
              min="0"
              step="any"
              value={newAddonPrice}
              onChange={(e) => {
                setNewAddonPrice(e.target.value);
                if (quickError) setQuickError('');
              }}
              placeholder="Sell Price"
              className={cn(
                'w-28 px-3.5 py-1.5 bg-white border rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors',
                quickError && (!newAddonPrice.trim() || parseFloat(newAddonPrice) <= 0)
                  ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-200'
                  : 'border-slate-200 focus:border-[#FF5C28]'
              )}
            />
            <button
              type="submit"
              className="flex items-center gap-1 px-3.5 py-1.5 bg-[#FF5C28] hover:bg-[#E04D1D] active:bg-[#D83F0E] text-white text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add</span>
            </button>

            {quickError && (
              <span className="text-[11px] font-bold text-rose-500 w-full sm:w-auto px-1 animate-fadeIn">
                * {quickError}
              </span>
            )}
          </form>
        ) : (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search add-ons..."
              className="w-full pl-9.5 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C28] transition-colors"
            />
          </div>
        )}

        {/* Right Side: Status Filter (for Cashier) / Search & Status Filter (for Admin) */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {!isCashier && (
            <div className="relative w-40 sm:w-52">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search add-ons..."
                className="w-full pl-9.5 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C28] transition-colors"
              />
            </div>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
          >
            <option value="All Status">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Add-ons DataTable */}
      <DataTable
        columns={columns}
        data={filteredAddons}
        emptyMessage={
          searchQuery || statusFilter !== 'All Status'
            ? 'No add-ons match the active filter criteria.'
            : isCashier
            ? 'No menu add-ons configured yet.'
            : 'No menu add-ons configured yet. Enter add-on name above to create one.'
        }
      />

      {/* Add / Edit Add-on Modal */}
      <AddonModal
        isOpen={isModalOpen}
        onClose={closeModal}
        addon={selectedAddon}
      />
    </div>
  );
};

export default AddonsList;
