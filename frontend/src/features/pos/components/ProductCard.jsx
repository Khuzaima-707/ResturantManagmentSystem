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
      className="group relative bg-white rounded-xl border border-slate-200/90 p-2 sm:p-2.5 shadow-2xs hover:shadow-xs hover:border-[#FF5C28] transition-all duration-150 flex flex-col justify-between cursor-pointer select-none"
    >
      {/* Top Image Preview & Badge */}
      {showImage && (
        <div className="relative mb-1.5">
          <div className="w-full h-20 sm:h-22 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 overflow-hidden relative border border-slate-100">
            {item.imageRef ? (
              <img
                src={item.imageRef}
                alt={item.name}
                className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <Utensils className="w-5 h-5 text-slate-300" />
            )}
          </div>

          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 rounded-full bg-white/95 backdrop-blur-xs text-[9px] font-bold text-[#FF5C28] border border-orange-100 shadow-2xs">
            {badgeText}
          </span>
        </div>
      )}

      {/* Item Details */}
      <div className="mb-1.5">
        {!showImage && (
          <span className="inline-block mb-1 px-1.5 py-0.2 rounded-full bg-orange-50 text-[9px] font-bold text-[#FF5C28] border border-orange-100">
            {badgeText}
          </span>
        )}
        <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#FF5C28] transition-colors line-clamp-1 leading-snug">
          {item.name}
        </h3>
        {item.description ? (
          <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">
            {item.description}
          </p>
        ) : null}
      </div>

      {/* Pricing & Add Button */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 mt-auto gap-1">
        <div className="min-w-0 flex-1 text-xs font-bold text-slate-900 leading-tight">
          <span className="font-extrabold">{formatCurrency(item.basePrice || 0)}</span>{' '}
          <span className="text-[9px] font-normal text-slate-400 whitespace-nowrap">
            / {item.unit || item.baseUnit || 'piece'}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item);
          }}
          className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-[#FF5C28] hover:bg-[#E04D1D] active:bg-[#D83F0E] text-white flex items-center justify-center shadow-2xs transition-transform active:scale-95 cursor-pointer shrink-0 ml-1"
          title={`Configure ${item.name}`}
          aria-label={`Configure ${item.name}`}
        >
          <Plus className="w-3 h-3 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
