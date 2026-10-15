import React, { useState, useMemo } from 'react';
import { FolderPlus, Pencil, Trash2, Power, Search } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataTable';
import { CategoryModal } from './CategoryModal';
import { useAppStore } from '../../../store';
import { cn } from '../../../utils/cn';

export const CategoriesList = ({ isAddModalOpen: externalAddModalOpen, onAddModalClose }) => {
  const { categories, items, addCategory, setCategoryStatus, deleteCategory, user } = useAppStore();
  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );

  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const isModalOpen = Boolean(!isCashier && (externalAddModalOpen || internalModalOpen));
  const closeModal = () => {
    setInternalModalOpen(false);
    setSelectedCategory(null);
    onAddModalClose?.();
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return (categories || []).filter((cat) => {
      if (!cat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = String(cat.name || '').toLowerCase().includes(q);
        const matchesKeyword =
          Array.isArray(cat.keywords) &&
          cat.keywords.some((kw) => String(kw || '').toLowerCase().includes(q));
        if (!matchesName && !matchesKeyword) return false;
      }
      return true;
    });
  }, [categories, searchQuery]);

  const handleOpenEdit = (cat) => {
    if (isCashier) return;
    setSelectedCategory(cat);
    setInternalModalOpen(true);
  };

  const handleToggleStatus = (cat) => {
    if (isCashier) return;
    const nextStatus = cat.status === 'active' ? 'inactive' : 'active';
    setCategoryStatus(cat.id, nextStatus);
  };

  const handleQuickAdd = (e) => {
    e?.preventDefault();
    if (isCashier) return;
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      // Do NOT open form/modal when empty; simply ignore
      return;
    }
    const slug = trimmed
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    addCategory({
      name: trimmed,
      slug,
      status: 'active',
      defaultUnitType: 'piece',
      baseUnit: 'piece',
      keywords: [trimmed.toLowerCase()],
      defaultPortions: [],
      defaultAddonIds: [],
    });
    setNewCategoryName('');
  };

  const columns = [
    {
      key: 'index',
      title: '#',
      headerClassName: 'w-14 text-center',
      align: 'center',
      render: (_, __, idx) => (
        <span className="text-xs font-semibold text-slate-400">
          {idx + 1}
        </span>
      ),
    },
    {
      key: 'name',
      title: 'Category Name',
      render: (val) => (
        <span className="font-bold text-xs text-slate-800">
          {val}
        </span>
      ),
    },
    {
      key: 'itemsCount',
      title: 'Items Count',
      align: 'center',
      headerClassName: 'text-center',
      render: (_, row) => {
        const count = (items || []).filter((i) => i && i.categoryId === row?.id).length;
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 border border-slate-200/90 text-slate-700 shadow-2xs">
            {count} {count === 1 ? 'item' : 'items'}
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            Inactive
          </span>
        ),
    },
    ...(!isCashier
      ? [
          {
            key: 'actions',
            title: 'Actions',
            align: 'right',
            headerClassName: 'text-right pr-4',
            render: (_, row) => (
              <div className="flex items-center justify-end gap-1.5 pr-2 text-slate-400">
                {/* Edit */}
                <button
                  type="button"
                  onClick={() => handleOpenEdit(row)}
                  className="p-1 rounded-md hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Edit Category"
                  aria-label="Edit Category"
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
                  title={row.status === 'active' ? 'Deactivate Category' : 'Activate Category'}
                  aria-label="Toggle Category Status"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>

                {/* Delete Category */}
                <button
                  type="button"
                  onClick={() => deleteCategory(row.id)}
                  className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Category"
                  aria-label="Delete Category"
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
      <div className={cn("flex flex-col sm:flex-row items-stretch sm:items-center gap-3", isCashier ? "justify-end" : "justify-between")}>
        {/* Quick Add Input matching Screenshot 1 (Admin only) */}
        {!isCashier && (
          <form onSubmit={handleQuickAdd} className="flex items-center gap-2.5 flex-1 max-w-md">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter new category name..."
              className="flex-1 min-w-[200px] px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C28] transition-colors"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF5C28] hover:bg-[#E04D1D] text-white text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5 stroke-[2]" />
              <span>Add Category</span>
            </button>
          </form>
        )}

        {/* Filter / Search by name or keyword */}
        <div className={cn("relative", isCashier ? "w-full sm:w-72" : "w-full sm:w-64")}>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-9.5 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C28] transition-colors"
          />
        </div>
      </div>

      {/* Categories DataTable matching Screenshot 1 */}
      <DataTable
        columns={columns}
        data={filteredCategories}
        emptyMessage={
          searchQuery
            ? 'No categories match the active search criteria.'
            : isCashier
            ? 'No menu categories created yet.'
            : 'No menu categories created yet. Enter category name above to start.'
        }
      />

      {/* Add / Edit Category Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={closeModal}
        category={selectedCategory}
      />


    </div>
  );
};

export default CategoriesList;

