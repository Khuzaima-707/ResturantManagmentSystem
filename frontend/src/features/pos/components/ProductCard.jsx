import React from 'react';
import { Utensils, Plus } from 'lucide-react';
import { formatCurrency } from '../../../domain/calculations';

/**
 * ProductCard Component for POS Item Catalog
 * Displays sellable menu item with image, category badge, name, description, and pricing.
 * Clicking anywhere on the card opens product configuration modal.
 */
export const ProductCard = ({ item, onSelect, showImage = true }) => {
  const isWeightBased = (item.unitType || '').toLowerCase() === 'weight' ||
    (item.unit || '').toLowerCase().includes('kg');

  const badgeText = isWeightBased ? 'Kg / Rs' : item.unit || item.baseUnit || 'Piece';

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-md hover:border-orange-200 transition-all duration-150 flex flex-col justify-between cursor-pointer select-none"
    >
      {/* Top Image Preview & Badge */}
      {showImage && (
        <div className="relative mb-2.5">
          <div className="w-full h-44 sm:h-52 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 overflow-hidden relative border border-slate-100">
            {item.imageRef ? (
              <img
                src={item.imageRef}
                alt={item.name}
                className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <Utensils className="w-9 h-9 text-slate-300" />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent pointer-events-none" />
          </div>

          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[10px] font-bold text-[#FF5C28] border border-orange-100 shadow-2xs">
            {badgeText}
          </span>
        </div>
      )}

      {/* Item Details */}
      <div className="mb-3">
        {!showImage && (
          <span className="inline-block mb-1 px-2 py-0.5 rounded-full bg-orange-50 text-[10px] font-bold text-[#FF5C28] border border-orange-100">
            {badgeText}
          </span>
        )}
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#FF5C28] transition-colors line-clamp-1">
          {item.name}
        </h3>
        {item.description ? (
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
            {item.description}
          </p>
        ) : null}
      </div>

      {/* Pricing & Add Button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="text-xs font-bold text-slate-900">
          <span>{formatCurrency(item.basePrice || 0)}</span>{' '}
          <span className="text-[10px] font-normal text-slate-400">
            / {item.unit || item.baseUnit || 'piece'}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item);
          }}
          className="w-7 h-7 rounded-full bg-[#FF5C28] hover:bg-[#E04D1D] active:bg-[#D83F0E] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
          title={`Configure ${item.name}`}
          aria-label={`Configure ${item.name}`}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
