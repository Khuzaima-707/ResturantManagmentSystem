import React, { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, X, Loader2, Power } from 'lucide-react';
import { useAppStore } from '../../store';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../domain/rules/expenseRules';

/**
 * ExpenseCategoryTab Component
 * Handles expense category configuration:
 * - Add, Edit, Activate/Deactivate categories
 * - Safe Delete: blocks deletion if any historical expenses use this category
 */
export const ExpenseCategoryTab = () => {
  const {
    expenseCategories,
    expenses,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
  } = useAppStore();

  // Combine store categories (do not resurrect deleted categories)
  const categoriesList = React.useMemo(() => {
    if (Array.isArray(expenseCategories)) {
      return expenseCategories;
    }
    return [];
  }, [expenseCategories]);

  // Map category usage count
  const categoryUsageCount = React.useMemo(() => {
    const counts = {};
    (expenses || []).forEach((e) => {
      const name = (e.categoryNameSnapshot || e.category || '').trim();
      const id = e.categoryId;
      if (name) counts[name] = (counts[name] || 0) + 1;
      if (id) counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [expenses]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryStatus, setCategoryStatus] = useState('active');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Blocked Delete Alert Modal State
  const [blockedAlert, setBlockedAlert] = useState(null);

  const openAddModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDesc('');
    setCategoryStatus('active');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setCategoryName(cat.name || '');
    setCategoryDesc(cat.description || '');
    setCategoryStatus(cat.status || 'active');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setModalError('Category name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError('');

      if (editingCategory) {
        await updateExpenseCategory(editingCategory.id, {
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          status: categoryStatus,
        });
      } else {
        await addExpenseCategory({
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          status: categoryStatus,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      setModalError(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat) => {
    const newStatus = cat.status === 'inactive' ? 'active' : 'inactive';
    try {
      await updateExpenseCategory(cat.id, { status: newStatus });
    } catch (err) {
      alert('Failed to update category status: ' + err.message);
    }
  };

  const handleDelete = async (cat) => {
    const usage =
      (categoryUsageCount[cat.name] || 0) + (categoryUsageCount[cat.id] || 0);

    if (usage > 0) {
      setBlockedAlert({
        name: cat.name,
        count: usage,
      });
      return;
    }

    try {
      await deleteExpenseCategory(cat.id);
    } catch (err) {
      console.warn('[ExpenseCategoryTab] delete category warning:', err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Configured Expense Categories</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize operational costs with custom classifications and lifecycle controls.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF5C28] hover:bg-[#E04D1D] text-white text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold select-none">
                <th className="py-2.5 px-4">Category Name</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4 text-center">Linked Expenses</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {categoriesList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    No expense categories configured. Click "+ Add Category" to create one.
                  </td>
                </tr>
              ) : (
                categoriesList.map((cat) => {
                const usage =
                  (categoryUsageCount[cat.name] || 0) + (categoryUsageCount[cat.id] || 0);
                const isActive = cat.status !== 'inactive';

                return (
                  <tr key={cat.id || cat.name} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {cat.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {cat.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                        {usage} entries
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(cat)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Click to toggle Active/Inactive"
                      >
                        <Power className="w-2.5 h-2.5" />
                        <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden cursor-default"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCategory ? 'Edit Expense Category' : 'Add Expense Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              {modalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity, Staff Salary, Rent..."
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#FF5C28]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description or purpose..."
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#FF5C28] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={categoryStatus}
                  onChange={(e) => setCategoryStatus(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#FF5C28]"
                >
                  <option value="active">Active (Available for new expenses)</option>
                  <option value="inactive">Inactive (Hidden from new expense forms)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#FF5C28] hover:bg-[#E04D1D] text-white text-xs font-bold rounded-full shadow-xs cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCategory ? 'Update Category' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blocked Delete Alert Modal */}
      {blockedAlert && (
        <div
          onClick={() => setBlockedAlert(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4 cursor-default"
          >
            <div className="flex items-center gap-2.5 text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Cannot Delete Historical Category</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Category <span className="font-bold text-slate-800">"{blockedAlert.name}"</span> is currently linked to{' '}
              <span className="font-bold text-slate-900">{blockedAlert.count} historical expense entries</span>.
              To maintain financial audit compliance and prevent broken ledgers, this category cannot be deleted.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
              <span className="font-semibold text-slate-700 block mb-0.5">Recommended action:</span>
              Deactivate the category instead. It will be hidden from new expense forms while preserving historical records.
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setBlockedAlert(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-full cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseCategoryTab;
