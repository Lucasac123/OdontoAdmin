import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth, moveToTrash, handleFirestoreError, OperationType } from '../firebase';
import { InventoryItem } from '../types';
import { Plus, Edit2, Trash2, AlertTriangle, Search } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'consumo' | 'patrimonio'>('consumo');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    quantity: 0,
    minQuantity: 0,
    unit: 'unidade',
    price: 0,
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
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inventory'));

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
        price: item.price || 0,
        category: item.category
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        quantity: 0,
        minQuantity: 0,
        unit: 'unidade',
        price: 0,
        category: 'Material de Consumo'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSaving) return;
    setIsSaving(true);

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
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    const item = items.find(i => i.id === itemToDelete);
    if (!item) return;

    setIsDeleting(true);
    try {
      await moveToTrash('inventory', itemToDelete, item);
      setIsConfirmModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inventory/${itemToDelete}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredItems = items
    .filter(i => activeTab === 'patrimonio' ? i.category === 'Patrimônio' : i.category !== 'Patrimônio')
    .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 shrink-0">
        <div>
          <h1 className="text-5xl font-black text-text-primary tracking-tight uppercase">Estoque</h1>
          <p className="text-text-secondary mt-2 font-medium uppercase tracking-widest text-xs">CONTROLE SEUS MATERIAIS E PATRIMÔNIO DA CLÍNICA</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-secondary group-focus-within:text-amber-500 transition-all" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="BUSCAR ITEM..."
              className="w-full bg-surface border border-zinc-200/50 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto bg-amber-600 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-700 active:scale-95 transition-all shadow-lg shadow-amber-500/20 font-black text-xs uppercase tracking-widest shrink-0"
          >
            <Plus size={20} />
            Novo Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0 overflow-hidden">
        <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
          <div className="bg-surface rounded-[32px] p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-800">
            <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-6 px-2">Categorias</h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('consumo')}
                className={`w-full text-left px-5 py-3 rounded-2xl transition-all flex items-center justify-between group ${
                  activeTab === 'consumo' 
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 font-bold border border-amber-100 dark:border-amber-500/20' 
                    : 'text-text-secondary hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-text-primary'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-tight">Materiais</span>
                <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-lg ${
                  activeTab === 'consumo' ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-zinc-100 dark:bg-zinc-800'
                }`}>
                  {items.filter(i => i.category !== 'Patrimônio').length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('patrimonio')}
                className={`w-full text-left px-5 py-3 rounded-2xl transition-all flex items-center justify-between group ${
                  activeTab === 'patrimonio' 
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 font-bold border border-amber-100 dark:border-amber-500/20' 
                    : 'text-text-secondary hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-text-primary'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-tight">Patrimônio</span>
                <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-lg ${
                  activeTab === 'patrimonio' ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-zinc-100 dark:bg-zinc-800'
                }`}>
                  {items.filter(i => i.category === 'Patrimônio').length}
                </span>
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-[32px] p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full -mr-12 -mt-12" />
            <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-6 px-2">Resumo de Valor</h3>
            <div className="space-y-5 px-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Estoque baixo</span>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${items.filter(i => i.quantity <= i.minQuantity).length > 0 ? 'bg-red-50 text-red-500 border border-red-100 dark:bg-red-500/10 dark:border-red-500/20' : 'bg-zinc-50 text-zinc-400'}`}>
                  {items.filter(i => i.quantity <= i.minQuantity).length} ITENS
                </span>
              </div>
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-2">Valor Estimado</span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tighter">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    filteredItems.reduce((acc, item) => acc + (Number(item.price) || 0) * item.quantity, 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 overflow-y-auto pr-2 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group bg-surface p-8 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/5 transition-all relative overflow-hidden flex flex-col"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-amber-500/10" />
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-text-primary group-hover:text-amber-600 transition-colors uppercase tracking-tight truncate">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200/50">{item.category}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <button 
                        onClick={() => handleOpenModal(item)}
                        className="p-2.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all border border-transparent hover:border-amber-100"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(item.id)}
                        className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-6 border-y border-zinc-100 dark:border-zinc-800/50">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Quantidade</span>
                      <div className="flex items-end gap-1">
                        <span className={`text-2xl font-black tracking-tight ${item.quantity <= item.minQuantity ? 'text-red-500' : 'text-text-primary'}`}>{item.quantity}</span>
                        <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest pb-1.5">{item.unit}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Preço Unit.</span>
                      <div className="flex items-end gap-1">
                        <span className="text-xl font-black text-text-primary tracking-tight">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.price) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className={item.quantity <= item.minQuantity ? 'text-red-500' : 'text-zinc-300'} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${item.quantity <= item.minQuantity ? 'text-red-500' : 'text-text-secondary opacity-60'}`}>
                        Mínimo: {item.minQuantity} {item.unit}
                      </span>
                    </div>
                    <div className="text-[9px] font-black text-text-secondary opacity-40 uppercase tracking-widest">
                      {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredItems.length === 0 && (
              <div className="col-span-full py-20 text-center bg-surface border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px]">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6">
                  <Search size={32} className="text-zinc-200" />
                </div>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">Nenhum item encontrado</h3>
                <p className="text-text-secondary max-w-xs mx-auto mt-2 text-xs font-medium uppercase tracking-widest">
                  Tente ajustar sua busca ou adicione um novo item ao estoque.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface rounded-[32px] shadow-2xl border border-zinc-200/50 dark:border-zinc-800 w-full max-w-lg overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full -mr-12 -mt-12" />
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">
                  {editingItem ? 'Editar Item' : 'Novo Item'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-text-secondary border border-zinc-200/50 transition-all">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Nome do Item</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="EX: RESINA COMPOSTA A3"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Categoria</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm outline-none cursor-pointer uppercase font-black"
                      >
                        <option value="Material de Consumo">Material de Consumo</option>
                        <option value="Material de Escritório">Material de Escritório</option>
                        <option value="Limpeza">Limpeza</option>
                        <option value="Patrimônio">Patrimônio</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Unidade</label>
                      <select
                        value={formData.unit}
                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm outline-none cursor-pointer uppercase font-black"
                      >
                        <option value="unidade">Unidade</option>
                        <option value="caixa">Caixa</option>
                        <option value="pacote">Pacote</option>
                        <option value="litro">Litro</option>
                        <option value="ml">ML</option>
                        <option value="grama">Grama</option>
                        <option value="kg">KG</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Qtd</label>
                      <input
                        type="number"
                        required
                        value={formData.quantity}
                        onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none font-black"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Mínimo</label>
                      <input
                        type="number"
                        required
                        value={formData.minQuantity}
                        onChange={e => setFormData({ ...formData, minQuantity: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none font-black"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">R$ Unit.</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none font-black"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 rounded-2xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 shadow-lg shadow-amber-500/20 transition-all text-center disabled:opacity-50"
                  >
                    {isSaving ? 'SALVANDO...' : 'SALVAR ITEM'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title="Excluir do Estoque"
        message="Tem certeza que deseja excluir este item? Ele será movido para a lixeira."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsConfirmModalOpen(false);
          setItemToDelete(null);
        }}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Inventory;
