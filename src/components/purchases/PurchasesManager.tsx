import { useState } from 'react';
import { FileText, Package, DollarSign } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import PurchaseRequestsList from './PurchaseRequestsList';
import QuotationsManager from './QuotationsManager';
import PurchaseOrdersManager from './PurchaseOrdersManager';

interface PurchasesManagerProps {
  onNavigateHome: () => void;
}

export default function PurchasesManager({ onNavigateHome }: PurchasesManagerProps) {
  const [activeView, setActiveView] = useState<'requests' | 'quotations' | 'orders'>('requests');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveView('requests')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
            activeView === 'requests'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700 border-transparent'
          }`}
          style={activeView === 'requests' ? { borderBottomColor: conktColors.primary.blue } : {}}
        >
          <FileText className="w-4 h-4" />
          Solicitações
        </button>
        <button
          onClick={() => setActiveView('quotations')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
            activeView === 'quotations'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700 border-transparent'
          }`}
          style={activeView === 'quotations' ? { borderBottomColor: conktColors.primary.blue } : {}}
        >
          <DollarSign className="w-4 h-4" />
          Cotações
        </button>
        <button
          onClick={() => setActiveView('orders')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
            activeView === 'orders'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700 border-transparent'
          }`}
          style={activeView === 'orders' ? { borderBottomColor: conktColors.primary.blue } : {}}
        >
          <Package className="w-4 h-4" />
          Pedidos
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {activeView === 'requests' && <PurchaseRequestsList onNavigateHome={onNavigateHome} />}
        {activeView === 'quotations' && (
          <QuotationsManager
            onNavigateHome={onNavigateHome}
            onNavigateToOrders={() => setActiveView('orders')}
          />
        )}
        {activeView === 'orders' && <PurchaseOrdersManager onNavigateHome={onNavigateHome} />}
      </div>
    </div>
  );
}
