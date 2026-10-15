import React from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { STANDARD_WEIGHT_PORTIONS } from '../../../domain/rules';

/**
 * PortionEditor Component
 * Allows configuring portion variations (e.g. 250g, 500g, 750g, 1kg or Small, Medium, Large)
 */
export const PortionEditor = ({
  portions = [],
  onChange,
  unitType = 'weight',
  baseUnit = 'kg',
}) => {
  const handleAddPortion = () => {
    const next = [
      ...portions,
      { label: `Portion ${portions.length + 1}`, quantityInBaseUnit: 1.0 },
    ];
    onChange?.(next);
  };

  const handleUpdate = (index, field, value) => {
    const next = portions.map((p, idx) => {
      if (idx !== index) return p;
      return {
        ...p,
        [field]: field === 'quantityInBaseUnit' ? Math.max(0.01, parseFloat(value) || 0) : value,
      };
    });
    onChange?.(next);
  };

  const handleRemove = (index) => {
    const next = portions.filter((_, idx) => idx !== index);
    onChange?.(next);
  };

  const handleApplyWeightPreset = () => {
    onChange?.(STANDARD_WEIGHT_PORTIONS);
  };

  return (
    <div className="flex flex-col gap-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">
          Serving Portions ({portions.length})
        </span>

        <div className="flex items-center gap-2">
          {unitType === 'weight' && (
            <button
              type="button"
              onClick={handleApplyWeightPreset}
              className="px-2.5 py-1 text-[11px] font-semibold text-[#FF5C28] bg-orange-50 hover:bg-orange-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Standard (250g-1kg)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddPortion}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Portion</span>
          </button>
        </div>
      </div>

      {portions.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic py-1">
          No custom portions configured. Item will be sold at standard {/^\d/.test((baseUnit || '').trim()) || ['half', 'full'].includes((baseUnit || '').trim().toLowerCase()) ? baseUnit : `1 ${baseUnit}`}.
        </p>
      ) : (
        <div className="space-y-2 mt-1">
          {portions.map((portion, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs"
            >
              <input
                type="text"
                value={portion.label}
                onChange={(e) => handleUpdate(idx, 'label', e.target.value)}
                placeholder="Label (e.g. 250g)"
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C28] font-medium text-slate-800"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">Qty ({baseUnit}):</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  value={portion.quantityInBaseUnit}
                  onChange={(e) => handleUpdate(idx, 'quantityInBaseUnit', e.target.value)}
                  className="w-20 text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5C28] font-semibold text-slate-800 text-center"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                aria-label="Remove portion"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortionEditor;
