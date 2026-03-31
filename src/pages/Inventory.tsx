import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth, moveToTrash, handleFirestoreError, OperationType } from '../firebase';
import { InventoryItem } from '../types';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'consumo' | 'patrimonio'>('consumo');

  const [formData, setFormData] = useState({
    name: '',
    quantity: '' as number | '',
    minQuantity: '' as number | '',
    unit: 'unidade',
    price: '' as number | '',
    category: 'Material de Consumo'
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'inventory'),
      where('dentistId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setItems(inventoryData.sort((a, b) => a.name.localeCompare(b.name)));
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        unit: item.unit,
        price: item.price || '',
        category: item.category
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        quantity: 0,
        minQuantity: 0,
        unit: 'unidade',
        price: '',
        category: 'Material de Consumo'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const itemData = {
        ...formData,
        dentistId: auth.currentUser.uid,
        updatedAt: new Date().toISOString()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'inventory', editingItem.id), itemData);
      } else {
        await addDoc(collection(db, 'inventory'), itemData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert('Erro ao salvar item.');
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const item = items.find(i => i.id === itemToDelete);
    if (!item) return;

    try {
      await moveToTrash('inventory', itemToDelete, item);
      setIsConfirmModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${itemToDelete}`);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items
    .filter(i => activeTab === 'patrimonio' ? i.category === 'Patrimônio' : i.category !== 'Patrimônio')
    .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Controle de Estoque</h1>
          <p className="text-text-secondary text-sm mt-1">Gerencie seus materiais e patrimônio</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          <Plus size={20} />
          Novo Item
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 px-2">Categorias</h3>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('consumo')}
                className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center justify-between group ${
                  activeTab === 'consumo' 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 font-semibold' 
                    : 'text-text-secondary hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-text-primary'
                }`}
              >
                <span>Material de Consumo</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'consumo' ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700'
                }`}>
                  {items.filter(i => i.category !== 'Patrimônio').length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('patrimonio')}
                className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center justify-between group ${
                  activeTab === 'patrimonio' 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 font-semibold' 
                    : 'text-text-secondary hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-text-primary'
                }`}
              >
                <span>Patrimônio</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'patrimonio' ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700'
                }`}>
                  {items.filter(i => i.category === 'Patrimônio').length}
                </span>
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 px-2">Resumo</h3>
            <div className="space-y-4 px-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Itens com estoque baixo</span>
                <span className="text-sm font-bold text-red-500">
                  {items.filter(i => i.quantity <= i.minQuantity).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Total em estoque</span>
                <span className="text-sm font-bold text-text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    items.reduce((acc, item) => acc + (Number(item.price) || 0) * item.quantity, 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-secondary group-focus-within:text-indigo-500 transition-colors">
              <Plus size={20} className="rotate-45" />
            </div>
            <input
              type="text"
              placeholder="Buscar itens no estoque..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-all shadow-sm"
            />
          </div>

          <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-text-secondary text-xs uppercase tracking-wider">Item</th>
                    <th className="text-left py-4 px-6 font-semibold text-text-secondary text-xs uppercase tracking-wider">Categoria</th>
                    <th className="text-left py-4 px-6 font-semibold text-text-secondary text-xs uppercase tracking-wider">Preço Unit.</th>
                    <th className="text-left py-4 px-6 font-semibold text-text-secondary text-xs uppercase tracking-wider">Quantidade</th>
                    <th className="text-left py-4 px-6 font-semibold text-text-secondary text-xs uppercase tracking-wider">Mínimo</th>
                    <th className="text-left py-4 px-6 font-semibold text-text-secondary text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right py-4 px-6 font-semibold text-text-secondary text-xs uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredItems.map((item) => {
                    const isLowStock = item.quantity <= item.minQuantity;
                    return (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={item.id} 
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                      >
                        <td className="py-4 px-6">
                          <div className="font-semibold text-text-primary">{item.name}</div>
                          <div className="text-[10px] text-text-secondary uppercase tracking-tighter">{item.unit}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-xs px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-text-secondary">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-text-primary font-medium">
                          {item.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price) : '-'}
                        </td>
                        <td className="py-4 px-6">
                          <div className={`font-bold ${isLowStock ? 'text-red-500' : 'text-text-primary'}`}>
                            {item.quantity}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-text-secondary text-sm font-medium">{item.minQuantity}</td>
                        <td className="py-4 px-6">
                          {isLowStock ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                              <AlertTriangle size={12} />
                              Estoque Baixo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              Adequado
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="p-2 text-text-secondary hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item.id)}
                              className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredItems.map((item) => {
                const isLowStock = item.quantity <= item.minQuantity;
                return (
                  <div key={item.id} className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-text-primary">{item.name}</h3>
                        <p className="text-xs text-text-secondary">{item.category} • {item.unit}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-2 text-text-secondary hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-text-secondary text-[10px] uppercase font-bold tracking-wider mb-1">Quantidade</p>
                        <p className={`text-lg font-bold ${isLowStock ? 'text-red-500' : 'text-text-primary'}`}>{item.quantity}</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-text-secondary text-[10px] uppercase font-bold tracking-wider mb-1">Mínimo</p>
                        <p className="text-lg font-bold text-text-primary">{item.minQuantity}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm font-medium text-text-primary">
                        {item.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price) : '-'}
                        <span className="text-xs text-text-secondary ml-1">/ unit.</span>
                      </div>
                      {isLowStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                          <AlertTriangle size={12} />
                          Estoque Baixo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          Adequado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="py-20 text-center">
                <div className="bg-zinc-100 dark:bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus size={32} className="text-text-secondary rotate-45" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">Nenhum item encontrado</h3>
                <p className="text-text-secondary max-w-xs mx-auto mt-1">
                  Tente ajustar sua busca ou adicione um novo item ao estoque.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-y-auto max-h-[90vh] relative"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <Plus size={24} className="rotate-45" />
              </button>

              <h2 className="text-2xl font-bold text-text-primary mb-2">
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </h2>
              <p className="text-text-secondary text-sm mb-8">Preencha os dados abaixo para gerenciar seu estoque.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Nome do Item</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Resina Composta A2"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-all outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Quantidade Atual</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Estoque Mínimo</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.minQuantity}
                        onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Unidade</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-all outline-none appearance-none cursor-pointer"
                      >
                        <option value="unidade">Unidade</option>
                        <option value="caixa">Caixa</option>
                        <option value="pacote">Pacote</option>
                        <option value="ml">ml</option>
                        <option value="g">g</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Preço Unitário</label>
                      <div className="relative">
                        <span className="absolute left-4 inset-y-0 flex items-center text-text-secondary text-sm">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? '' : Number(e.target.value) })}
                          className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-all outline-none"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Categoria</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="Material de Consumo">Material de Consumo</option>
                      <option value="Instrumental">Instrumental</option>
                      <option value="Medicamento">Medicamento</option>
                      <option value="EPI">EPI</option>
                      <option value="Patrimônio">Patrimônio (Equipamentos, Móveis)</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto px-8 py-3 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-95"
                  >
                    Salvar Item
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Item"
        message="Tem certeza que deseja excluir este item do estoque? Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default Inventory;
