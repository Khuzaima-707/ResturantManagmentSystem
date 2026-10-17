import React, { useState, useMemo } from 'react';
import { Pencil, Trash2, Tag, Search, Sparkles } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataTable';
import { DealModal } from './DealModal';
import { useAppStore } from '../../../store';
import { calculateDealFinancials, formatCurrency } from '../../../domain/calculations';
import { isCashierUser } from '../../../domain/selectors/invoiceSelectors';

export const DealsList = ({ isAddModalOpen: externalAddModalOpen, onAddModalClose }) => {
  const { deals = [], deleteDeal, setDealStatus, user } = useAppStore();
  const isCashier = isCashierUser(user);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);

  const isModalOpen = Boolean(!isCashier && (externalAddModalOpen || internalModalOpen));
  const closeModal = () => {
    setInternalModalOpen(false);
    setSelectedDeal(null);
    onAddModalClose?.();
  };

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return (deals || []).filter((deal) => {
      if (!deal) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = String(deal.name || '').toLowerCase().includes(q);
        const matchesDesc = String(deal.description || '').toLowerCase().includes(q);
        const matchesItems = Array.isArray(deal.includedItems) && deal.includedItems.some(
          (inc) => inc && String(inc.name || '').toLowerCase().includes(q)
        );
        if (!matchesName && !matchesDesc && !matchesItems) return false;
      }

      if (statusFilter !== 'All Status') {
        if (String(deal.status || 'active').toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [deals, searchQuery, statusFilter]);

  const handleOpenEdit = (deal) => {
    if (isCashier) return;
    setSelectedDeal(deal);
    setInternalModalOpen(true);
  };

  const columns = [
    {
      title: '#',
      dataIndex: 'index',
      width: '45px',
      render: (_, __, index) => (
        <span className="text-slate-400 font-mono text-[11px]">{index + 1}</span>
      ),
    },
    {
      title: 'Deal',
      dataIndex: 'name',
      render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF5C28] overflow-hidden shrink-0 shadow-2xs">
            {row.imageRef ? (
              <img src={row.imageRef} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <Tag className="w-4 h-4 stroke-[2.2]" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-900 block truncate text-xs">{row.name}</span>
            {row.description && (
              <span className="text-[10px] text-slate-400 block truncate max-w-xs">{row.description}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'includedItems',
      title: 'Included Items',
      dataIndex: 'includedItems',
      render: (_, row) => {
        const itemsList = Array.isArray(row.includedItems) ? row.includedItems : [];
        if (itemsList.length === 0) return <span className="text-slate-400 text-xs">No items</span>;

        return (
          <div className="space-y-0.5 max-w-xs">
            {itemsList.map((inc, i) => (
              <div key={i} className="text-[11px] text-slate-600 font-medium truncate">
                • {inc.name}{inc.portion ? ` (${inc.portion})` : ''}{inc.quantity && inc.quantity > 1 ? ` x${inc.quantity}` : ''}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: isCashier ? 'Deal Price' : 'Regular / Deal Price',
      dataIndex: 'dealPrice',
      render: (_, row) => {
        if (isCashier) {
          return (
            <span className="font-bold text-slate-900 text-xs">
              {formatCurrency(row.dealPrice || 0)}
            </span>
          );
        }
        const fin = calculateDealFinancials(row.includedItems || [], row.dealPrice || 0);
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-xs">{formatCurrency(row.dealPrice || 0)}</span>
              {fin.regularPrice > row.dealPrice && (
                <span className="text-[10px] text-slate-400 line-through">
                  {formatCurrency(fin.regularPrice)}
                </span>
              )}
            </div>
            {fin.customerSaving > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full inline-block">
                Save {formatCurrency(fin.customerSaving)}
              </span>
            )}
          </div>
        );
      },
    },
    ...(!isCashier
      ? [
          {
            title: 'Cost & Margin',
            dataIndex: 'costPrice',
            render: (_, row) => {
              const fin = calculateDealFinancials(row.includedItems || [], row.dealPrice || 0);
              if (!fin.hasCost || fin.totalCost === null) {
                return (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full inline-block">
                    Missing Cost
                  </span>
                );
              }

              return (
                <div className="text-[11px]">
                  <span className="text-slate-500 font-medium">Cost: Rs {fin.totalCost}</span>
                  <div className="font-bold text-emerald-600">
                    Profit: Rs {fin.estimatedGrossProfit} ({fin.profitMargin}%)
                  </div>
                </div>
              );
            },
          },
        ]
      : []),
    {
      title: 'Status',
      dataIndex: 'status',
      width: '110px',
      render: (status, row) => {
        const isActive = status === 'active';
        return (
          <button
            type="button"
            disabled={isCashier}
            onClick={() => setDealStatus(row.id, isActive ? 'inactive' : 'active')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
            } ${isCashier ? 'cursor-default opacity-90' : ''}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
            <span>{isActive ? 'Active' : 'Inactive'}</span>
          </button>
        );
      },
    },
    ...(!isCashier
      ? [
          {
            title: 'Actions',
            dataIndex: 'actions',
            width: '80px',
            render: (_, row) => (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(row)}
                  className="p-1.5 text-slate-400 hover:text-[#FF5C28] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit deal"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete deal "${row.name}"?`)) {
                      deleteDeal(row.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete deal"
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
    <div className="space-y-3">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals or included items..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28] transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-full text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 cursor-pointer"
          >
            <option value="All Status">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Deals Table */}
      <DataTable
        columns={columns}
        data={filteredDeals}
        emptyMessage={
          deals.length === 0
            ? 'No deals created yet. Click "+ Add Deal" to create your first bundle!'
            : 'No matching deals found.'
        }
      />

      {/* Deal Add/Edit Modal */}
      {isModalOpen && (
        <DealModal
          isOpen={isModalOpen}
          onClose={closeModal}
          deal={selectedDeal}
        />
      )}
    </div>
  );
};

export default DealsList;
