import React, { useState, useMemo } from 'react';
import { Pencil, Trash2, Utensils, Search } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataTable';
import { ItemModal } from './ItemModal';
import { useAppStore } from '../../../store';

export const ItemsList = ({ isAddModalOpen: externalAddModalOpen, onAddModalClose }) => {
  const { items, categories, deleteItem, user } = useAppStore();
  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const isModalOpen = Boolean(externalAddModalOpen || internalModalOpen);
  const closeModal = () => {
    setInternalModalOpen(false);
    setSelectedItem(null);
    onAddModalClose?.();
  };

  // Category map for name lookup
  const categoryMap = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => {
      if (c && c.id) map.set(c.id, c.name || '');
    });
    return map;
  }, [categories]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return (items || []).filter((item) => {
      if (!item) return false;
      // 1. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = String(item.name || '').toLowerCase().includes(q);
        const matchesCategory = String(item.categoryName || categoryMap.get(item.categoryId) || '').toLowerCase().includes(q);
        const matchesDesc = String(item.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesDesc) return false;
      }

      // 2. Category filter
      if (categoryFilter !== 'All Categories') {
        if (item.categoryId !== categoryFilter) return false;
      }

      // 3. Status filter
      if (statusFilter !== 'All Status') {
        if (String(item.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [items, searchQuery, categoryFilter, statusFilter, categoryMap]);

  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setInternalModalOpen(true);
  };

  const categoryFilterOptions = useMemo(() => {
    return [
      { value: 'All Categories', label: 'All Categories' },
      ...(categories || []).map((c) => ({ value: c.id, label: c.name || 'Category' })),
    ];
  }, [categories]);

  const columns = [
    {
      key: 'index',
      title: '#',
      headerClassName: 'w-10 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (_, __, idx) => (
        <span className="text-xs font-medium text-slate-400">
          {idx + 1}
        </span>
      ),
    },
    {
      key: 'imageRef',
      title: 'Image',
      headerClassName: 'w-14 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (img, row) => (
        <div className="w-8.5 h-8.5 aspect-square mx-auto rounded-lg bg-orange-50/70 border border-slate-100 overflow-hidden flex items-center justify-center text-[#FF5C28] shrink-0 shadow-2xs">
          {img ? (
            <img
              src={img}
              alt={row.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <Utensils className="w-3.5 h-3.5 text-orange-400" />
          )}
        </div>
      ),
    },
    {
      key: 'name',
      title: 'Item Name',
      headerClassName: 'min-w-[140px]',
      render: (name) => (
        <span className="font-bold text-xs text-slate-800 truncate block">
          {name}
        </span>
      ),
    },
    {
      key: 'categoryId',
      title: 'Category',
      headerClassName: 'w-28 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (catId, row) => {
        const catName = row.categoryName || categoryMap.get(catId) || 'General';
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
            {catName}
          </span>
        );
      },
    },
    {
      key: 'description',
      title: 'Description',
      headerClassName: 'min-w-[180px] max-w-xs',
      render: (desc) => (
        <p className="text-[11px] text-slate-400 line-clamp-1">
          {desc || '—'}
        </p>
      ),
    },
    {
      key: 'basePrice',
      title: 'Price / Unit',
      headerClassName: 'w-36 whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
      render: (price, row) => {
        const unitLabel = row.unit || row.baseUnit || 'Piece';
        return (
          <div className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span className="font-bold text-xs text-slate-800">
              Rs {Number(price || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              ({unitLabel})
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center',
      headerClassName: 'w-24 text-center',
      cellClassName: 'text-center',
      render: (status) =>
        status === 'active' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            Inactive
          </span>
        ),
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right',
      headerClassName: 'w-16 text-right pr-4',
      cellClassName: 'text-right pr-4',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Edit */}
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Edit Item"
            aria-label="Edit Item"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete (Admin Only) */}
          {!isCashier && (
            <button
              type="button"
              onClick={() => deleteItem(row.id)}
              className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete Item"
              aria-label="Delete Item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Controls / Filter Bar matching Screenshot 2 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: Pill Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-9.5 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C28] transition-colors"
          />
        </div>

        {/* Right: Dropdowns */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
          >
            {categoryFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
          >
            <option value="All Status">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Items DataTable matching Screenshot 2 */}
      <DataTable
        columns={columns}
        data={filteredItems}
        emptyMessage={
          searchQuery || categoryFilter !== 'All Categories' || statusFilter !== 'All Status'
            ? 'No food items match the active search and filter criteria.'
            : 'No menu items in catalog yet. Click "+ Add Item" to add your first dish.'
        }
      />

      {/* Add / Edit Food Item Modal */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={closeModal}
        item={selectedItem}
      />


    </div>
  );
};

export default ItemsList;

