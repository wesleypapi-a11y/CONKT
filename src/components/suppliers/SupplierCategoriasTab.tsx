import { useState, useEffect } from 'react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { SupplierCategory, SUPPLIER_CATEGORIES } from '../../types/supplier';

interface SupplierCategoriasTabProps {
  supplierId: string | null;
}

export default function SupplierCategoriasTab({ supplierId }: SupplierCategoriasTabProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supplierId) {
      loadCategories();
    }
  }, [supplierId]);

  const loadCategories = async () => {
    if (!supplierId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_categories')
        .select('*')
        .eq('supplier_id', supplierId);

      if (error) throw error;
      setSelectedCategories((data || []).map((cat: SupplierCategory) => cat.category_name));
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategory = async (categoryName: string) => {
    if (!supplierId) {
      alert('Salve o fornecedor primeiro');
      return;
    }

    setLoading(true);
    try {
      const isSelected = selectedCategories.includes(categoryName);

      if (isSelected) {
        const { error } = await supabase
          .from('supplier_categories')
          .delete()
          .eq('supplier_id', supplierId)
          .eq('category_name', categoryName);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('supplier_categories')
          .insert({
            supplier_id: supplierId,
            category_name: categoryName
          });

        if (error) throw error;
      }

      await loadCategories();
    } catch (error) {
      console.error('Error toggling category:', error);
      alert('Erro ao atualizar categoria');
    } finally {
      setLoading(false);
    }
  };

  if (!supplierId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o fornecedor primeiro para selecionar categorias
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-base font-semibold mb-4" style={{ color: arcoColors.text.primary }}>
          Categorias de fornecimento
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Selecione as categorias de produtos/serviços que este fornecedor oferece:
        </p>

        <div className="space-y-3">
          {SUPPLIER_CATEGORIES.map((category) => (
            <label
              key={category}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => handleToggleCategory(category)}
                disabled={loading}
                className="w-5 h-5 cursor-pointer"
                style={{ accentColor: arcoColors.primary.blue }}
              />
              <span className="text-sm font-medium text-gray-700">{category}</span>
            </label>
          ))}
        </div>

        {selectedCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{selectedCategories.length}</span> categoria(s) selecionada(s)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
