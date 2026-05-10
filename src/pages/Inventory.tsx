import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth, moveToTrash, handleFirestoreError, OperationType } from '../firebase';
import { InventoryItem, InventoryKit } from '../types';
import { 
  Plus, Edit2, Trash2, AlertTriangle, Package, Folder, 
  Minus, Tag, Info, Layers, ChevronRight, Box, Filter,
  Stethoscope, Syringe, Heart, Shield, MoreVertical, Search
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import { useSync } from '../context/SyncContext';

const DENTAL_BRANDS = [
  'Straumann', 'Neodent', 'Nobel Biocare', '3M ESPE', 'Ivoclar Vivadent',
  'Coltene', 'Tokuyama Dental', 'GC Corporation', 'Dentsply Sirona', 'FGM',
  'Kulzer', 'Kerr', 'Ultradent', 'Zimmer Biomet', 'Osstem', 'SIN Implantes'
];

const CATEGORIES = [
  { id: 'Implantodontia', icon: <Package className="w-4 h-4" /> },
  { id: 'Dentística', icon: <Box className="w-4 h-4" /> },
  { id: 'Endodontia', icon: <Syringe className="w-4 h-4" /> },
  { id: 'Periodontia', icon: <Filter className="w-4 h-4" /> },
  { id: 'Prótese', icon: <Layers className="w-4 h-4" /> },
  { id: 'Cirurgia', icon: <Heart className="w-4 h-4" /> },
  { id: 'EPI', icon: <Shield className="w-4 h-4" /> },
  { id: 'Medicamentos', icon: <Stethoscope className="w-4 h-4" /> },
  { id: 'Instrumental', icon: <Filter className="w-4 h-4" /> },
  { id: 'Patrimônio', icon: <Box className="w-4 h-4" /> },
  { id: 'Outros', icon: <Tag className="w-4 h-4" /> }
];

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [kits, setKits] = useState<InventoryKit[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingKit, setEditingKit] = useState<InventoryKit | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { addSyncTask } = useSync();
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    reference: '',
    quantity: 0,
    minQuantity: 0,
    unit: 'unidade',
    price: '' as number | '',
    category: 'Material de Consumo',
    kitId: '',
    notes: '',
    implantSpec: {
      diameter: '',
      length: '',
      platform: '',
      connection: ''
    },
    resinSpec: {
      shade: '',
      opacity: '',
      system: ''
    }
  });

  const [kitFormData, setKitFormData] = useState({
    name: '',
    icon: '📦',
    color: '#4f46e5',
    description: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch Items
    const qItems = query(
      collection(db, 'inventory'),
      where('dentistId', '==', auth.currentUser.uid)
    );

    const unsubItems = onSnapshot(qItems, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setItems(inventoryData.sort((a, b) => a.name.localeCompare(b.name)));
    });

    // Fetch Kits
    const qKits = query(
      collection(db, 'inventoryKits'),
      where('dentistId', '==', auth.currentUser.uid)
    );

    const unsubKits = onSnapshot(qKits, (snapshot) => {
      const kitsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryKit[];
      setKits(kitsData.sort((a, b) => a.name.localeCompare(b.name)));
    });

    return () => {
      unsubItems();
      unsubKits();
    };
  }, []);

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        brand: item.brand || '',
        reference: item.reference || '',
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        unit: item.unit,
        price: item.price || '',
        category: item.category,
        kitId: item.kitId || '',
        notes: item.notes || '',
        implantSpec: { 
          diameter: item.implantSpec?.diameter || '', 
          length: item.implantSpec?.length || '', 
          platform: item.implantSpec?.platform || '', 
          connection: item.implantSpec?.connection || '' 
        },
        resinSpec: { 
          shade: item.resinSpec?.shade || '', 
          opacity: item.resinSpec?.opacity || '', 
          system: item.resinSpec?.system || '' 
        }
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        brand: '',
        reference: '',
        quantity: 0,
        minQuantity: 0,
        unit: 'unidade',
        price: '',
        category: 'Dentística',
        kitId: selectedKitId || '',
        notes: '',
        implantSpec: { diameter: '', length: '', platform: '', connection: '' },
        resinSpec: { shade: '', opacity: '', system: '' }
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenKitModal = (kit?: InventoryKit) => {
    if (kit) {
      setEditingKit(kit);
      setKitFormData({
        name: kit.name,
        icon: kit.icon,
        color: kit.color,
        description: kit.description || ''
      });
    } else {
      setEditingKit(null);
      setKitFormData({
        name: '',
        icon: '📦',
        color: '#4f46e5',
        description: ''
      });
    }
    setIsKitModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);

    const itemData = {
      ...formData,
      dentistId: auth.currentUser.uid,
      updatedAt: new Date().toISOString()
    };

    try {
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

  const handleKitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);

    const kitData = {
      ...kitFormData,
      dentistId: auth.currentUser.uid,
      createdAt: editingKit ? editingKit.createdAt : new Date().toISOString()
    };

    try {
      if (editingKit) {
        await updateDoc(doc(db, 'inventoryKits', editingKit.id), kitData);
      } else {
        await addDoc(collection(db, 'inventoryKits'), kitData);
      }
      setIsKitModalOpen(false);
    } catch (error) {
      console.error('Error saving kit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateQuantity = async (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newQuantity = Math.max(0, item.quantity + delta);
    try {
      await updateDoc(doc(db, 'inventory', id), {
        quantity: newQuantity,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const item = items.find(i => i.id === itemToDelete);
    if (!item) return;

    const deletePromise = moveToTrash('inventory', itemToDelete, item).catch(error => {
      console.error("Erro ao excluir item do estoque:", error);
      handleFirestoreError(error, OperationType.DELETE, `inventory/${itemToDelete}`);
    });
    
    addSyncTask(deletePromise);
    setIsConfirmModalOpen(false);
    setItemToDelete(null);
  };

  const filteredItems = items
    .filter(i => activeCategory === 'All' ? true : i.category === activeCategory)
    .filter(i => selectedKitId ? i.kitId === selectedKitId : true)
    .filter(i => 
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.brand && i.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (i.reference && i.reference.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Estoque e Materiais</h1>
          <p className="text-sm text-text-secondary mt-1">Controle especializado para Implantodontia, Dentística e Kits</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleOpenKitModal()}
            className="flex-1 sm:flex-none border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-text-primary px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
          >
            <Folder size={20} className="text-indigo-500" />
            Novo Kit
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex-1 sm:flex-none bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
          >
            <Plus size={20} />
            Novo Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Categories */}
          <div className="bg-surface rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Categorias</h3>
              <button 
                onClick={() => { setActiveCategory('All'); setSelectedKitId(null); }}
                className="text-[10px] text-indigo-500 font-semibold uppercase hover:underline disabled:opacity-50"
                disabled={activeCategory === 'All' && !selectedKitId}
              >
                Limpar
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setActiveCategory('All'); setSelectedKitId(null); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeCategory === 'All' && !selectedKitId
                    ? 'bg-indigo-500 text-white dark:bg-indigo-500 shadow-sm' 
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-text-secondary hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-text-primary'
                }`}
              >
                <Package size={13} />
                <span>Todos</span>
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setSelectedKitId(null); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeCategory === cat.id 
                      ? 'bg-indigo-500 text-white shadow-sm' 
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-text-secondary hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-text-primary'
                  }`}
                >
                  <span className="[&>svg]:w-3 [&>svg]:h-3">
                    {cat.icon}
                  </span>
                  <span>{cat.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Kits / Pastas */}
          <div className="bg-surface rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 px-2">Meus Kits (Pastas)</h3>
            <div className="space-y-1">
              {kits.length === 0 ? (
                <div className="px-4 py-6 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl">
                  <p className="text-xs text-text-secondary">Nenhum kit criado.</p>
                </div>
              ) : (
                kits.map(kit => (
                  <button
                    key={kit.id}
                    onClick={() => { setSelectedKitId(kit.id); setActiveCategory('All'); }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center justify-between group ${
                      selectedKitId === kit.id 
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-text-primary font-semibold ring-1 ring-zinc-200 dark:ring-zinc-700' 
                        : 'text-text-secondary hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{kit.icon}</span>
                      <span className="text-sm truncate max-w-[120px]">{kit.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-md">
                        {items.filter(i => i.kitId === kit.id).length}
                      </span>
                      <Edit2 
                        size={12} 
                        className="opacity-0 group-hover:opacity-100 hover:text-indigo-500" 
                        onClick={(e) => { e.stopPropagation(); handleOpenKitModal(kit); }}
                      />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Low Stock Alert */}
          {items.some(i => i.quantity <= i.minQuantity) && (
            <div className="bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle size={14} />
                Atenção
              </div>
              <p className="text-xs text-red-500 leading-tight">
                Há {items.filter(i => i.quantity <= i.minQuantity).length} itens com estoque baixo.
              </p>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative group">
            <Search size={20} className="absolute left-4 top-3.5 text-text-secondary group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por nome, marca ou referência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-text-primary transition-all shadow-sm"
            />
          </div>

          {/* Items Grid/List */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const isLowStock = item.quantity <= item.minQuantity;
              return (
                <motion.div
                  layout
                  key={item.id}
                  className={`bg-surface p-5 rounded-3xl border ${isLowStock ? 'border-red-200 dark:border-red-900/50 bg-red-50/10' : 'border-zinc-200 dark:border-zinc-800'} shadow-sm hover:shadow-md transition-all group`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-text-secondary">
                          {item.category}
                        </span>
                        {item.brand && (
                          <span className="text-[10px] font-bold text-indigo-500 uppercase">
                            {item.brand}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-text-primary text-base truncate" title={item.name}>{item.name}</h3>
                      {item.reference && <p className="text-[10px] text-text-secondary font-mono">REF: {item.reference}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleOpenModal(item)} className="p-1.5 text-text-secondary hover:text-indigo-500 transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteClick(item.id)} className="p-1.5 text-text-secondary hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  {/* Specific Specs display */}
                  {(item.implantSpec?.diameter || item.resinSpec?.shade) && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {item.implantSpec?.diameter && (
                        <span className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 px-1.5 py-0.5 rounded">
                          Ø {item.implantSpec.diameter}mm × {item.implantSpec.length}mm
                        </span>
                      )}
                      {item.resinSpec?.shade && (
                        <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 px-1.5 py-0.5 rounded uppercase">
                          Cor: {item.resinSpec.shade} • {item.resinSpec.opacity}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-text-primary transition-all active:scale-90"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="flex flex-col items-center min-w-[40px]">
                        <span className={`text-xl font-black ${isLowStock ? 'text-red-500' : 'text-text-primary'}`}>
                          {item.quantity}
                        </span>
                        <span className="text-[8px] uppercase tracking-tighter text-text-secondary -mt-1">{item.unit}</span>
                      </div>
                      <button 
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white transition-all active:scale-90 shadow-sm"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Valor</p>
                      <p className="text-sm font-bold text-text-primary">
                        {item.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price) : '-'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="py-32 text-center bg-surface rounded-3xl border border-zinc-100 dark:border-zinc-800">
              <Package size={48} className="mx-auto text-zinc-200 dark:text-zinc-800 mb-4" />
              <p className="text-text-secondary font-medium">Nenhum item encontrado.</p>
              <button onClick={() => handleOpenModal()} className="text-indigo-500 text-sm font-bold mt-2 hover:underline">Adicionar seu primeiro material</button>
            </div>
          )}
        </div>
      </div>

      {/* Item Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-y-auto max-h-[95vh] relative"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><Plus size={24} className="rotate-45" /></button>
              
              <h2 className="text-2xl font-bold text-text-primary mb-1">{editingItem ? 'Editar Material' : 'Novo Material'}</h2>
              <p className="text-text-secondary text-sm mb-8">Especialize os dados conforme a área clínica.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Nome do Material</label>
                      <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-text-primary outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Resina, Implante..." />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Marca</label>
                        <input list="dental-brands" type="text" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-text-primary outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Marca" />
                        <datalist id="dental-brands">
                          {DENTAL_BRANDS.map(b => <option key={b} value={b} />)}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Referência</label>
                        <input type="text" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-text-primary outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Cód. Ref." />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Categoria</label>
                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-text-primary outline-none focus:ring-2 focus:ring-indigo-500">
                          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Pasta (Kit)</label>
                        <select value={formData.kitId} onChange={e => setFormData({ ...formData, kitId: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-text-primary outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="">Nenhum Kit</option>
                          {kits.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Preço Unitário</label>
                        <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-text-primary outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0,00" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">Unidade</label>
                        <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-text-primary outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="unidade">Unidade</option>
                          <option value="caixa">Caixa</option>
                          <option value="pacote">Pacote</option>
                          <option value="seringa">Seringa</option>
                          <option value="envelope">Envelope</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Specialized Fields */}
                  <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Especificações Técnicas</h3>
                    
                    {formData.category === 'Implantodontia' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Diâmetro (mm)</label>
                            <input type="text" value={formData.implantSpec.diameter} onChange={e => setFormData({...formData, implantSpec: {...formData.implantSpec, diameter: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm" placeholder="Ex: 3.5" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Comprimento (mm)</label>
                            <input type="text" value={formData.implantSpec.length} onChange={e => setFormData({...formData, implantSpec: {...formData.implantSpec, length: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm" placeholder="Ex: 10" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Conexão</label>
                            <select value={formData.implantSpec.connection} onChange={e => setFormData({...formData, implantSpec: {...formData.implantSpec, connection: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                              <option value="">Selecionar</option>
                              <option value="Hex. Externo">Hex. Externo</option>
                              <option value="Hex. Interno">Hex. Interno</option>
                              <option value="Cone Morse">Cone Morse</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Plataforma</label>
                            <select value={formData.implantSpec.platform} onChange={e => setFormData({...formData, implantSpec: {...formData.implantSpec, platform: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                              <option value="">Selecionar</option>
                              <option value="NP (Narrow)">NP (Narrow)</option>
                              <option value="RP (Regular)">RP (Regular)</option>
                              <option value="WP (Wide)">WP (Wide)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : formData.category === 'Dentística' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Cor / Matiz</label>
                          <input type="text" value={formData.resinSpec.shade} onChange={e => setFormData({...formData, resinSpec: {...formData.resinSpec, shade: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm" placeholder="Ex: A2, B1, OA2..." />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Opacidade</label>
                            <select value={formData.resinSpec.opacity} onChange={e => setFormData({...formData, resinSpec: {...formData.resinSpec, opacity: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                              <option value="">Selecionar</option>
                              <option value="Esmalte">Esmalte</option>
                              <option value="Dentina">Dentina</option>
                              <option value="Body">Body</option>
                              <option value="Translúcida">Translúcida</option>
                              <option value="Opaca">Opaca</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Sistema</label>
                            <select value={formData.resinSpec.system} onChange={e => setFormData({...formData, resinSpec: {...formData.resinSpec, system: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                              <option value="">Selecionar</option>
                              <option value="Incremental">Incremental</option>
                              <option value="Bulk Fill">Bulk Fill</option>
                              <option value="Flow">Flow</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 text-center space-y-2 opacity-50">
                        <Info className="mx-auto text-zinc-300" />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Campos adicionais específicos <br/> para Implante e Resinas.</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 mt-4">Observações Internas</label>
                      <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm resize-none h-20" placeholder="Ex: Validade, fornecedor..." />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5 ml-1">Quantidade em Estoque</label>
                    <input type="number" required min="0" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })} className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl text-text-primary text-xl font-bold text-center" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5 ml-1">Aviso de Estoque Mínimo</label>
                    <input type="number" required min="0" value={formData.minQuantity} onChange={e => setFormData({ ...formData, minQuantity: Number(e.target.value) })} className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl text-text-primary text-xl font-bold text-center" />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 text-text-secondary font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-[2] bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50">
                    {isSaving ? 'Salvando...' : 'Salvar Material'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kit Modal */}
      <AnimatePresence>
        {isKitModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-3xl p-8 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800 relative"
            >
              <button onClick={() => setIsKitModalOpen(false)} className="absolute top-6 right-6 p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><Plus size={24} className="rotate-45" /></button>
              
              <h2 className="text-xl font-bold text-text-primary mb-1">{editingKit ? 'Editar Kit' : 'Criar Nova Pasta de Kit'}</h2>
              <p className="text-text-secondary text-xs mb-6">Agrupe materiais para procedimentos específicos.</p>

              <form onSubmit={handleKitSubmit} className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-16">
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 ml-1 text-center">Ícone</label>
                    <input type="text" value={kitFormData.icon} onChange={e => setKitFormData({ ...kitFormData, icon: e.target.value })} className="w-full py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-xl" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 ml-1">Nome do Kit</label>
                    <input type="text" required value={kitFormData.name} onChange={e => setKitFormData({ ...kitFormData, name: e.target.value })} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-text-primary outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Kit Implantodontia" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 ml-1">Descrição</label>
                  <textarea value={kitFormData.description} onChange={e => setKitFormData({ ...kitFormData, description: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-text-primary outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-20 text-sm" placeholder="Opcional..." />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsKitModalOpen(false)} className="flex-1 py-3 text-text-secondary font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-[2] bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50">
                    {editingKit ? 'Salvar Alterações' : 'Criar Kit'}
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
        title="Excluir Material"
        message="Deseja mesmo remover este item do estoque? Ele será enviado para a lixeira."
      />
    </div>
  );
};

export default Inventory;
