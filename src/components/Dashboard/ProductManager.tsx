import React, { useState } from "react";
import { 
  Package, 
  Plus, 
  Loader2, 
  Edit3, 
  Trash2 
} from "lucide-react";
import { motion } from "motion/react";
import { Product } from "../../types";
import { formatPrice } from "../../lib/helpers";
import { deleteProduct } from "../../lib/firebaseUtils";
import ProductForm from "./ProductForm";

interface ProductManagerProps {
  unitId: string;
  ownerId: string;
  products: Product[];
  productsLoading: boolean;
  onRefreshProducts: () => void;
}

export default function ProductManager({
  unitId,
  ownerId,
  products,
  productsLoading,
  onRefreshProducts,
}: ProductManagerProps) {
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const handleDeleteProductClick = (productId: string) => {
    setProductToDelete(productId);
  };

  const handleEditProductClick = (prod: Product) => {
    setEditingProduct(prod);
    setIsAddingProduct(true);
  };

  const handleFormSave = () => {
    setIsAddingProduct(false);
    setEditingProduct(null);
    onRefreshProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-indigo-600" />
          <h3 className="font-extrabold text-lg text-slate-800">کاتالوگ محصولات کارگاه</h3>
        </div>
        
        {!isAddingProduct && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsAddingProduct(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-50 hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>افزودن محصول جدید</span>
          </button>
        )}
      </div>

      {/* Adding / Editing Product Form */}
      {isAddingProduct && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
        >
          <ProductForm
            editingProduct={editingProduct}
            unitId={unitId}
            ownerId={ownerId}
            onSave={handleFormSave}
            onCancel={() => {
              setIsAddingProduct(false);
              setEditingProduct(null);
            }}
          />
        </motion.div>
      )}

      {/* Product List Grid */}
      {productsLoading ? (
        <div className="flex justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="text-xs">در حال بارگذاری کاتالوگ...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
          <Package className="h-10 w-10 mx-auto stroke-1 text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-500">هیچ محصولی ثبت نشده است</p>
          <p className="text-xs text-slate-400 mt-1">با کلیک روی دکمه «افزودن محصول جدید»، اولین محصول تولیدی کارگاه خود را ثبت کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((prod, index) => (
            <div
              key={`${prod.id}-${index}`}
              className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group hover:border-slate-200 hover:shadow-md transition-all duration-300 text-right"
              style={{ direction: "rtl" }}
            >
              <div>
                <div className="h-44 bg-slate-50 border-b border-slate-100 relative overflow-hidden">
                  <img src={prod.image} alt={prod.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-slate-800 text-sm mb-1.5">{prod.name}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{prod.description || "بدون توضیحات."}</p>
                  {prod.price && (
                    <div className="text-xs font-extrabold text-indigo-600 mt-2.5 flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-normal">حدود قیمت:</span>
                      <span>{formatPrice(prod.price)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin product actions */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleEditProductClick(prod)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all cursor-pointer"
                  title="ویرایش"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteProductClick(prod.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all cursor-pointer"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" style={{ direction: "rtl" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 max-w-sm w-full p-6 shadow-xl text-center space-y-4"
          >
            <div className="mx-auto h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-sm">حذف محصول</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                آیا از حذف این محصول مطمئن هستید؟ این عمل غیر قابل بازگشت است.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={async () => {
                  try {
                    await deleteProduct(productToDelete);
                    onRefreshProducts();
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setProductToDelete(null);
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-100 cursor-pointer"
              >
                بله، حذف کن
              </button>
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
