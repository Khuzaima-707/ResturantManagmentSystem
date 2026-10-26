import React from 'react';
import { Tag, Plus, Sparkles } from 'lucide-react';
import { formatCurrency, calculateDealFinancials } from '../../../domain/calculations';

/**
 * DealCard Component for POS Item Catalog
 * Displays sellable deal with photo, deal badge, name, short included-items summary, and price.
 * Clicking adds ONE deal line directly to the cart.
 */
export const DealCard = ({ deal, onAddToCart, showImage = true }) => {
  const incItems = Array.isArray(deal.includedItems) ? deal.includedItems : [];
  const financials = calculateDealFinancials(incItems, deal.dealPrice || 0);

  const handleAdd = (e) => {
    e.stopPropagation();

    // Construct immutable deal cart line
    const dealCartLine = {
      id: `line_deal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      itemId: deal.id,
      dealId: deal.id,
      isDeal: true,
      itemNameSnapshot: deal.name,
      itemImageSnapshot: deal.imageRef || '',
      categoryIdSnapshot: 'cat-deals',
      categoryNameSnapshot: 'Deals',
      pricingMode: 'deal',
      basePriceSnapshot: deal.dealPrice || 0,
      unitPrice: deal.dealPrice || 0,
      quantity: 1,
      lineSubtotal: deal.dealPrice || 0,
      baseUnitSnapshot: 'Deal',
      selectedPortionLabel: 'Deal Bundle',
      includedItems: incItems.map((inc) => ({
        itemId: inc.itemId,
        itemType: inc.itemType || 'item',
        name: inc.name,
        quantity: inc.quantity || 1,
        unit: inc.unit || 'Piece',
        portion: inc.portion || '',
        weightGrams: inc.weightGrams || null,
        sellingPrice: Number(inc.sellingPrice) || 0,
        costPrice: inc.costPrice !== undefined && inc.costPrice !== null ? Number(inc.costPrice) : null,
      })),
      addonSnapshots: [],
      note: '',
    };

    onAddToCart(dealCartLine);
  };

  return (
    <div
      onClick={handleAdd}
      className="group relative bg-white rounded-xl border-2 border-orange-200/80 p-2 sm:p-2.5 shadow-2xs hover:shadow-xs hover:border-[#FF5C28] transition-all duration-150 flex flex-col justify-between cursor-pointer select-none ring-1 ring-orange-50"
    >
      {/* Top Image Preview & Badge */}
      {showImage && (
        <div className="relative mb-1.5">
          <div className="w-full h-20 sm:h-22 rounded-lg bg-orange-50/50 flex items-center justify-center text-slate-300 overflow-hidden relative border border-orange-100/70">
            {deal.imageRef ? (
              <img
                src={deal.imageRef}
                alt={deal.name}
                className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-[#FF5C28]">
                <Tag className="w-5 h-5 stroke-[1.8]" />
                <span className="text-[8px] font-bold uppercase tracking-wider">Deal</span>
              </div>
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent pointer-events-none" />
          </div>

          <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
            <span className="px-1.5 py-0.2 rounded-full bg-[#FF5C28] text-white text-[9px] font-extrabold shadow-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>DEAL</span>
            </span>
            {financials.customerSaving > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-bold shadow-xs">
                Save Rs {financials.customerSaving}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Deal Details */}
      <div className="mb-1.5">
        {!showImage && (
          <div className="flex items-center gap-1 mb-1">
            <span className="px-1.5 py-0.2 rounded-md bg-[#FF5C28] text-white text-[9px] font-extrabold">
              DEAL
            </span>
            {financials.customerSaving > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                Save Rs {financials.customerSaving}
              </span>
            )}
          </div>
        )}

        <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#FF5C28] transition-colors line-clamp-1 leading-snug">
          {deal.name}
        </h3>

        {/* Short included items summary */}
        <div className="mt-0.5 space-y-0.5">
          {incItems.slice(0, 2).map((inc, i) => (
            <p key={i} className="text-[9px] text-slate-500 font-medium truncate leading-tight">
              • {inc.name}{inc.portion ? ` (${inc.portion})` : ''}{inc.quantity && inc.quantity > 1 ? ` x${inc.quantity}` : ''}
            </p>
          ))}
          {incItems.length > 2 && (
            <p className="text-[8px] text-[#FF5C28] font-bold leading-tight">
              +{incItems.length - 2} more items
            </p>
          )}
        </div>
      </div>

      {/* Pricing & Add Button */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 mt-auto gap-1">
        <div className="min-w-0 flex-1 text-xs font-bold text-slate-900 leading-tight">
          <span className="text-xs font-extrabold text-[#FF5C28]">{formatCurrency(deal.dealPrice || 0)}</span>
          {financials.regularPrice > (deal.dealPrice || 0) && (
            <span className="text-[9px] text-slate-400 line-through ml-1 font-normal whitespace-nowrap">
              {formatCurrency(financials.regularPrice)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-[#FF5C28] hover:bg-[#E04D1D] active:bg-[#D83F0E] text-white flex items-center justify-center shadow-2xs transition-transform active:scale-95 cursor-pointer shrink-0 ml-1"
          title={`Add ${deal.name} to order`}
          aria-label={`Add ${deal.name} to order`}
        >
          <Plus className="w-3 h-3 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

export default DealCard;
