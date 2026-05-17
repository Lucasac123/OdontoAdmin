import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db, auth, moveToTrash, handleFirestoreError, OperationType } from '../firebase';
import { InventoryItem, InventoryKit } from '../types';
import { 
  Plus, Edit2, Trash2, AlertTriangle, Package, Folder, 
  Minus, Tag, Info, Layers, Box, Filter, Recycle,
  Stethoscope, Syringe, Heart, Shield, Search, Zap, ChevronDown, ChevronRight
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import { useSync } from '../context/SyncContext';

const DENTAL_BRANDS = [
  'Neodent', 'Straumann', 'Nobel Biocare', 'SIN Implantes', 'Implacil De Bortoli', 'Intraoss',
  '3M ESPE', 'Ivoclar Vivadent', 'Coltene', 'Tokuyama Dental', 'GC Corporation',
  'Dentsply Sirona', 'FGM', 'Kulzer', 'Kerr', 'Ultradent', 'Zimmer Biomet', 'Osstem'
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

// ── Implant manufacturers with their specific connections/platforms ──
const IMPLANT_MANUFACTURER_SPECS: Record<string, { connections: string[]; platforms: string[] }> = {
  'Neodent': {
    connections: ['Cone Morse (CM)', 'Grand Morse (GM)', 'Hex Externo', 'Acqua'],
    platforms: ['NP 3.5mm', 'RP 4.1mm', 'WP 5.0mm', 'GM 5.0mm', 'GM 6.0mm']
  },
  'Straumann': {
    connections: ['Bone Level (BL)', 'Tissue Level (TL)', 'BLX', 'BLT'],
    platforms: ['NC 3.3mm', 'RC 4.1mm', 'WN 4.8mm']
  },
  'Nobel Biocare': {
    connections: ['Conical Connection (CC)', 'Hex Externo', 'Tri-lobe'],
    platforms: ['NP 3.5mm', 'RP 4.3mm', 'WP 5.0mm']
  },
  'SIN Implantes': {
    connections: ['Cone Morse', 'Hex Interno', 'Hex Externo'],
    platforms: ['NP 3.5mm', 'RP 4.1mm', 'WP 5.0mm']
  },
  'Implacil De Bortoli': {
    connections: ['Cone Morse', 'Hex Interno'],
    platforms: ['Standard 3.75mm', 'Wide 5.0mm']
  },
  'Intraoss': {
    connections: ['Cone Morse', 'Hex Interno'],
    platforms: ['NP 3.3mm', 'RP 4.0mm']
  },
  'Outro': {
    connections: ['Cone Morse', 'Hex Externo', 'Hex Interno', 'Torx'],
    platforms: ['NP (Narrow)', 'RP (Regular)', 'WP (Wide)']
  }
};

// ── Endodontic file quick presets ──
interface EndoPreset { name: string; icon: string; items: Partial<InventoryItem>[] }
const ENDO_PRESETS: EndoPreset[] = [
  {
    name: 'ProTaper Gold (S1-F3)', icon: '🦷',
    items: [
      { name: 'ProTaper Gold S1', endoSpec: { fileType: 'Rotatória', fileSystem: 'ProTaper Gold', caliber: '17', taper: 'Variável', length: '25mm', manufacturer: 'Dentsply Sirona' } },
      { name: 'ProTaper Gold S2', endoSpec: { fileType: 'Rotatória', fileSystem: 'ProTaper Gold', caliber: '20', taper: 'Variável', length: '25mm', manufacturer: 'Dentsply Sirona' } },
      { name: 'ProTaper Gold F1', endoSpec: { fileType: 'Rotatória', fileSystem: 'ProTaper Gold', caliber: '20', taper: '7%', length: '25mm', manufacturer: 'Dentsply Sirona' } },
      { name: 'ProTaper Gold F2', endoSpec: { fileType: 'Rotatória', fileSystem: 'ProTaper Gold', caliber: '25', taper: '8%', length: '25mm', manufacturer: 'Dentsply Sirona' } },
      { name: 'ProTaper Gold F3', endoSpec: { fileType: 'Rotatória', fileSystem: 'ProTaper Gold', caliber: '30', taper: '9%', length: '25mm', manufacturer: 'Dentsply Sirona' } },
    ]
  },
  {
    name: 'WaveOne Gold (Sequência)', icon: '〰️',
    items: [
      { name: 'WaveOne Gold Small', endoSpec: { fileType: 'Reciprocante', fileSystem: 'WaveOne Gold', caliber: '20', taper: '7%', length: '25mm', manufacturer: 'Dentsply Sirona' } },
      { name: 'WaveOne Gold Primary', endoSpec: { fileType: 'Reciprocante', fileSystem: 'WaveOne Gold', caliber: '25', taper: '8%', length: '25mm', manufacturer: 'Dentsply Sirona' } },
      { name: 'WaveOne Gold Medium', endoSpec: { fileType: 'Reciprocante', fileSystem: 'WaveOne Gold', caliber: '35', taper: '6%', length: '25mm', manufacturer: 'Dentsply Sirona' } },
      { name: 'WaveOne Gold Large', endoSpec: { fileType: 'Reciprocante', fileSystem: 'WaveOne Gold', caliber: '45', taper: '5%', length: '25mm', manufacturer: 'Dentsply Sirona' } },
    ]
  },
  {
    name: 'Reciproc (R25/R40/R50)', icon: '↩️',
    items: [
      { name: 'Reciproc R25', endoSpec: { fileType: 'Reciprocante', fileSystem: 'Reciproc', caliber: '25', taper: '8%', length: '25mm', manufacturer: 'VDW' } },
      { name: 'Reciproc R40', endoSpec: { fileType: 'Reciprocante', fileSystem: 'Reciproc', caliber: '40', taper: '6%', length: '25mm', manufacturer: 'VDW' } },
      { name: 'Reciproc R50', endoSpec: { fileType: 'Reciprocante', fileSystem: 'Reciproc', caliber: '50', taper: '5%', length: '25mm', manufacturer: 'VDW' } },
    ]
  },
  {
    name: 'Kit Lima K (15 → 40)', icon: '📏',
    items: [
      { name: 'Lima K #15', endoSpec: { fileType: 'Manual', fileSystem: 'K-File', caliber: '15', taper: '2%', length: '25mm', manufacturer: 'Mani' } },
      { name: 'Lima K #20', endoSpec: { fileType: 'Manual', fileSystem: 'K-File', caliber: '20', taper: '2%', length: '25mm', manufacturer: 'Mani' } },
      { name: 'Lima K #25', endoSpec: { fileType: 'Manual', fileSystem: 'K-File', caliber: '25', taper: '2%', length: '25mm', manufacturer: 'Mani' } },
      { name: 'Lima K #30', endoSpec: { fileType: 'Manual', fileSystem: 'K-File', caliber: '30', taper: '2%', length: '25mm', manufacturer: 'Mani' } },
      { name: 'Lima K #35', endoSpec: { fileType: 'Manual', fileSystem: 'K-File', caliber: '35', taper: '2%', length: '25mm', manufacturer: 'Mani' } },
      { name: 'Lima K #40', endoSpec: { fileType: 'Manual', fileSystem: 'K-File', caliber: '40', taper: '2%', length: '25mm', manufacturer: 'Mani' } },
    ]
  },
];

// ── Quick-fill bundles for all categories ──
interface QuickBundle { name: string; icon: string; items: Partial<InventoryItem>[] }
const QUICK_FILL_BUNDLES: Record<string, QuickBundle[]> = {
  'Implantodontia': [
    {
      name: 'Kit Neodent CM 3.5×10mm', icon: '🔩',
      items: [
        { name: 'Implante Neodent CM 3.5×10mm', brand: 'Neodent', category: 'Implantodontia', unit: 'unidade', minQuantity: 2, quantity: 0, implantSpec: { manufacturer: 'Neodent', diameter: '3.5', length: '10', connection: 'Cone Morse (CM)', platform: 'NP 3.5mm' } },
        { name: 'Cicatrizador Neodent NP', brand: 'Neodent', category: 'Implantodontia', unit: 'unidade', minQuantity: 1, quantity: 0 },
        { name: 'Parafuso de Cobertura Neodent NP', brand: 'Neodent', category: 'Implantodontia', unit: 'unidade', minQuantity: 2, quantity: 0 },
      ]
    },
    {
      name: 'Kit Straumann BL RC 4.1mm', icon: '🔩',
      items: [
        { name: 'Implante Straumann BL RC 4.1×10mm', brand: 'Straumann', category: 'Implantodontia', unit: 'unidade', minQuantity: 2, quantity: 0, implantSpec: { manufacturer: 'Straumann', diameter: '4.1', length: '10', connection: 'Bone Level (BL)', platform: 'RC 4.1mm' } },
        { name: 'Tampa de Cicatrização Straumann RC', brand: 'Straumann', category: 'Implantodontia', unit: 'unidade', minQuantity: 1, quantity: 0 },
      ]
    },
  ],
  'Dentística': [
    {
      name: 'Kit Filtek Z350 (A2/A3)', icon: '🪥',
      items: [
        { name: 'Filtek Z350 Esmalte A2', brand: '3M ESPE', category: 'Dentística', unit: 'seringa', minQuantity: 1, quantity: 0, resinSpec: { shade: 'A2', opacity: 'Esmalte', system: 'Incremental', colorSystem: 'VITA Classical' } },
        { name: 'Filtek Z350 Dentina A2', brand: '3M ESPE', category: 'Dentística', unit: 'seringa', minQuantity: 1, quantity: 0, resinSpec: { shade: 'A2', opacity: 'Dentina', system: 'Incremental', colorSystem: 'VITA Classical' } },
        { name: 'Filtek Z350 Esmalte A3', brand: '3M ESPE', category: 'Dentística', unit: 'seringa', minQuantity: 1, quantity: 0, resinSpec: { shade: 'A3', opacity: 'Esmalte', system: 'Incremental', colorSystem: 'VITA Classical' } },
        { name: 'Filtek Z350 Flow A2', brand: '3M ESPE', category: 'Dentística', unit: 'seringa', minQuantity: 1, quantity: 0, resinSpec: { shade: 'A2', opacity: 'Body', system: 'Flow', colorSystem: 'VITA Classical' } },
        { name: 'Filtek Z350 Body A2', brand: '3M ESPE', category: 'Dentística', unit: 'seringa', minQuantity: 1, quantity: 0, resinSpec: { shade: 'A2', opacity: 'Body', system: 'Incremental', colorSystem: 'VITA Classical' } },
      ]
    },
    {
      name: 'Kit Empress Direct (A1/A2/A3)', icon: '💎',
      items: [
        { name: 'Empress Direct Esmalte A1', brand: 'Ivoclar Vivadent', category: 'Dentística', unit: 'seringa', minQuantity: 1, quantity: 0, resinSpec: { shade: 'A1', opacity: 'Esmalte', system: 'Incremental', colorSystem: 'VITA Classical' } },
        { name: 'Empress Direct Esmalte A2', brand: 'Ivoclar Vivadent', category: 'Dentística', unit: 'seringa', minQuantity: 1, quantity: 0, resinSpec: { shade: 'A2', opacity: 'Esmalte', system: 'Incremental', colorSystem: 'VITA Classical' } },
        { name: 'Empress Direct Dentina A2', brand: 'Ivoclar Vivadent', category: 'Dentística', unit: 'seringa', minQuantity: 1, quantity: 0, resinSpec: { shade: 'A2', opacity: 'Dentina', system: 'Incremental', colorSystem: 'VITA Classical' } },
        { name: 'Empress Direct Translúcida T', brand: 'Ivoclar Vivadent', category: 'Dentística', unit: 'seringa', minQuantity: 1, quantity: 0, resinSpec: { shade: 'T', opacity: 'Translúcida', system: 'Incremental', colorSystem: 'VITA Classical' } },
      ]
    },
  ],
  'Endodontia': ENDO_PRESETS.map(p => ({ name: p.name, icon: p.icon, items: p.items.map(i => ({ ...i, category: 'Endodontia', unit: 'unidade', minQuantity: 3, quantity: 0, isReusable: false, brand: i.endoSpec?.manufacturer })) })),
  'Cirurgia': [
    {
      name: 'Kit Sutura Básico', icon: '🧵',
      items: [
        { name: 'Fio Nylon 3-0 c/24', brand: 'Ethicon', category: 'Cirurgia', unit: 'caixa', minQuantity: 2, quantity: 0, surgicalSpec: { sutureType: 'Nylon', sutureSize: '3-0' } },
        { name: 'Fio Nylon 4-0 c/24', brand: 'Ethicon', category: 'Cirurgia', unit: 'caixa', minQuantity: 2, quantity: 0, surgicalSpec: { sutureType: 'Nylon', sutureSize: '4-0' } },
        { name: 'Fio Vicryl 3-0 c/24', brand: 'Ethicon', category: 'Cirurgia', unit: 'caixa', minQuantity: 1, quantity: 0, surgicalSpec: { sutureType: 'Vicryl', sutureSize: '3-0' } },
      ]
    },
    {
      name: 'Kit Anestésico Básico', icon: '💉',
      items: [
        { name: 'Mepivacaína 2% c/Vasoconst.', brand: 'DFL', category: 'Cirurgia', unit: 'caixa', minQuantity: 5, quantity: 0, surgicalSpec: { anestheticType: 'Mepivacaína', anestheticConc: '2%' } },
        { name: 'Lidocaína 2% c/Epinefrina', brand: 'Sankin', category: 'Cirurgia', unit: 'caixa', minQuantity: 5, quantity: 0, surgicalSpec: { anestheticType: 'Lidocaína', anestheticConc: '2%' } },
      ]
    },
  ],
  'Periodontia': [
    {
      name: 'Kit Regeneração Básico', icon: '🦴',
      items: [
        { name: 'Bio-Oss Xenoenxerto 0.5g', brand: 'Geistlich', category: 'Periodontia', unit: 'unidade', minQuantity: 2, quantity: 0, perioSpec: { materialType: 'Enxerto ósseo', graftOrigin: 'Xenógeno' } },
        { name: 'Bio-Gide Membrana Reabsorvível', brand: 'Geistlich', category: 'Periodontia', unit: 'unidade', minQuantity: 2, quantity: 0, perioSpec: { materialType: 'Membrana reabsorvível', graftOrigin: 'Xenógeno' } },
      ]
    },
  ],
  'EPI': [
    {
      name: 'Kit EPI Padrão', icon: '🛡️',
      items: [
        { name: 'Luva Látex P c/100', category: 'EPI', unit: 'caixa', minQuantity: 3, quantity: 0, brand: 'Supermax' },
        { name: 'Luva Látex M c/100', category: 'EPI', unit: 'caixa', minQuantity: 3, quantity: 0, brand: 'Supermax' },
        { name: 'Luva Látex G c/100', category: 'EPI', unit: 'caixa', minQuantity: 3, quantity: 0, brand: 'Supermax' },
        { name: 'Máscara Cirúrgica c/50', category: 'EPI', unit: 'caixa', minQuantity: 5, quantity: 0 },
        { name: 'Óculos de Proteção', category: 'EPI', unit: 'unidade', minQuantity: 2, quantity: 0, isReusable: true },
      ]
    },
  ],
};

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
  const [showQuickFill, setShowQuickFill] = useState(false);
  const [quickFillBatch, setQuickFillBatch] = useState<string[]>([]);

  const emptyForm = {
    name: '',
    brand: '',
    reference: '',
    quantity: 0,
    minQuantity: 0,
    unit: 'unidade',
    price: '' as number | '',
    category: 'Dentística',
    kitId: '',
    notes: '',
    isReusable: false,
    implantSpec: { manufacturer: '', diameter: '', length: '', platform: '', connection: '' },
    resinSpec: { shade: '', opacity: '', system: '', colorSystem: '' },
    endoSpec: { fileType: '', fileSystem: '', caliber: '', length: '', taper: '', manufacturer: '' },
    surgicalSpec: { sutureType: '', sutureSize: '', anestheticType: '', anestheticConc: '' },
    perioSpec: { materialType: '', graftOrigin: '' },
    prostheticsSpec: { type: '', material: '', cementType: '' }
  };

  const [formData, setFormData] = useState(emptyForm);

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
        isReusable: item.isReusable ?? false,
        implantSpec: {
          manufacturer: item.implantSpec?.manufacturer || '',
          diameter: item.implantSpec?.diameter || '',
          length: item.implantSpec?.length || '',
          platform: item.implantSpec?.platform || '',
          connection: item.implantSpec?.connection || ''
        },
        resinSpec: {
          shade: item.resinSpec?.shade || '',
          opacity: item.resinSpec?.opacity || '',
          system: item.resinSpec?.system || '',
          colorSystem: item.resinSpec?.colorSystem || ''
        },
        endoSpec: {
          fileType: item.endoSpec?.fileType || '',
          fileSystem: item.endoSpec?.fileSystem || '',
          caliber: item.endoSpec?.caliber || '',
          length: item.endoSpec?.length || '',
          taper: item.endoSpec?.taper || '',
          manufacturer: item.endoSpec?.manufacturer || ''
        },
        surgicalSpec: {
          sutureType: item.surgicalSpec?.sutureType || '',
          sutureSize: item.surgicalSpec?.sutureSize || '',
          anestheticType: item.surgicalSpec?.anestheticType || '',
          anestheticConc: item.surgicalSpec?.anestheticConc || ''
        },
        perioSpec: {
          materialType: item.perioSpec?.materialType || '',
          graftOrigin: item.perioSpec?.graftOrigin || ''
        },
        prostheticsSpec: {
          type: item.prostheticsSpec?.type || '',
          material: item.prostheticsSpec?.material || '',
          cementType: item.prostheticsSpec?.cementType || ''
        }
      });
    } else {
      setEditingItem(null);
      setFormData({ ...emptyForm, category: activeCategory !== 'All' ? activeCategory : 'Dentística', kitId: selectedKitId || '' });
    }
    setIsModalOpen(true);
  };

  // ── Quick Fill: bulk-add preset items to inventory ──
  const handleQuickFill = async (bundle: QuickBundle) => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const names: string[] = [];
    bundle.items.forEach(item => {
      const ref = doc(collection(db, 'inventory'));
      batch.set(ref, {
        dentistId: auth.currentUser!.uid,
        name: item.name ?? 'Item',
        brand: item.brand ?? '',
        reference: '',
        quantity: item.quantity ?? 0,
        minQuantity: item.minQuantity ?? 1,
        unit: item.unit ?? 'unidade',
        category: item.category ?? activeCategory,
        kitId: selectedKitId ?? '',
        notes: '',
        isReusable: item.isReusable ?? false,
        ...(item.implantSpec ? { implantSpec: item.implantSpec } : {}),
        ...(item.resinSpec ? { resinSpec: item.resinSpec } : {}),
        ...(item.endoSpec ? { endoSpec: item.endoSpec } : {}),
        ...(item.surgicalSpec ? { surgicalSpec: item.surgicalSpec } : {}),
        ...(item.perioSpec ? { perioSpec: item.perioSpec } : {}),
        ...(item.prostheticsSpec ? { prostheticsSpec: item.prostheticsSpec } : {}),
        updatedAt: now
      });
      names.push(item.name ?? 'Item');
    });
    try {
      await batch.commit();
      setQuickFillBatch(names);
      setTimeout(() => setQuickFillBatch([]), 4000);
    } catch (err) {
      console.error('Quick fill error:', err);
    } finally {
      setIsSaving(false);
    }
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
            onClick={() => setShowQuickFill(!showQuickFill)}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-bold border text-sm ${
              showQuickFill 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400' 
                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-text-primary hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-sm'
            }`}
          >
            <Zap size={18} className={showQuickFill ? 'fill-indigo-500 text-indigo-500 animate-pulse' : 'text-zinc-400'} />
            Preenchimento Inteligente
          </button>
          <button
            onClick={() => handleOpenKitModal()}
            className="flex-1 sm:flex-none border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-text-primary px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all text-sm shadow-sm"
          >
            <Folder size={18} className="text-indigo-500" />
            Novo Kit
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex-1 sm:flex-none bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-md text-sm active:scale-95 font-bold"
          >
            <Plus size={18} />
            Novo Item
          </button>
        </div>
      </div>

      {/* Quick Fill Tray */}
      <AnimatePresence>
        {showQuickFill && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-indigo-50/50 dark:bg-indigo-500/5 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-500/10 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 fill-indigo-500 text-indigo-500 animate-pulse" />
                  Preenchimento Clínico Rápido
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Cadastre pacotes inteiros de materiais odontológicos essenciais por fabricante e especialidade com um único clique.
                </p>
              </div>
              <button 
                onClick={() => setShowQuickFill(false)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Ocultar Painel
              </button>
            </div>

            {/* Quick Fill Batches success note */}
            {quickFillBatch.length > 0 && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="p-3 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 rounded-2xl text-xs font-medium"
              >
                ✅ {quickFillBatch.length} itens adicionados com sucesso: {quickFillBatch.join(', ')}
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(QUICK_FILL_BUNDLES).map(([categoryName, bundles]) => (
                <div key={categoryName} className="space-y-2 p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">
                    {categoryName}
                  </span>
                  <div className="space-y-1.5">
                    {bundles.map((bundle, idx) => (
                      <button
                        key={`${categoryName}-${idx}`}
                        onClick={() => handleQuickFill(bundle)}
                        disabled={isSaving}
                        className="w-full text-left p-2.5 bg-zinc-50 hover:bg-indigo-50/50 dark:bg-zinc-950 dark:hover:bg-indigo-950/20 rounded-xl transition-all border border-zinc-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-500/20 flex items-center justify-between group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg bg-white dark:bg-zinc-900 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border border-zinc-100 dark:border-zinc-800">
                            {bundle.icon}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-text-primary group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {bundle.name}
                            </p>
                            <p className="text-[9px] text-text-secondary font-medium">
                              {bundle.items.length} itens inclusos
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                          Adicionar →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  key={`cat-${cat.id}`}
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
                    key={`kit-${kit.id}`}
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
                  key={`item-${item.id}`}
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
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.isReusable && (
                      <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Reutilizável
                      </span>
                    )}
                    {item.implantSpec?.diameter && (
                      <span className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 px-1.5 py-0.5 rounded">
                        Ø {item.implantSpec.diameter}mm × {item.implantSpec.length}mm ({item.implantSpec.connection || 'S/C'})
                      </span>
                    )}
                    {item.resinSpec?.shade && (
                      <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 px-1.5 py-0.5 rounded uppercase">
                        Cor: {item.resinSpec.shade} • {item.resinSpec.opacity}
                      </span>
                    )}
                    {item.endoSpec?.fileSystem && (
                      <span className="text-[9px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 px-1.5 py-0.5 rounded uppercase">
                        Endo: {item.endoSpec.fileSystem} • #{item.endoSpec.caliber} • {item.endoSpec.length}
                      </span>
                    )}
                    {item.surgicalSpec?.sutureType && (
                      <span className="text-[9px] font-bold bg-red-100 dark:bg-red-500/20 text-red-700 px-1.5 py-0.5 rounded uppercase">
                        Cir: {item.surgicalSpec.sutureType} {item.surgicalSpec.sutureSize}
                      </span>
                    )}
                    {item.perioSpec?.materialType && (
                      <span className="text-[9px] font-bold bg-teal-100 dark:bg-teal-500/20 text-teal-700 px-1.5 py-0.5 rounded uppercase">
                        Perio: {item.perioSpec.materialType}
                      </span>
                    )}
                    {item.prostheticsSpec?.type && (
                      <span className="text-[9px] font-bold bg-sky-100 dark:bg-sky-500/20 text-sky-700 px-1.5 py-0.5 rounded uppercase">
                        Prót: {item.prostheticsSpec.type} • {item.prostheticsSpec.material}
                      </span>
                    )}
                  </div>

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
                    
                    {/* isReusable Checkbox */}
                    <div className="flex items-center gap-2 mb-4 p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
                      <input
                        type="checkbox"
                        id="isReusable"
                        checked={formData.isReusable || false}
                        onChange={e => setFormData({ ...formData, isReusable: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 border-zinc-300 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor="isReusable" className="text-xs font-bold text-text-primary uppercase cursor-pointer select-none">
                        Material Reutilizável (Não deduzir do estoque)
                      </label>
                    </div>

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
                              <option value="Grand Morse (GM)">Grand Morse (GM)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Plataforma</label>
                            <select value={formData.implantSpec.platform} onChange={e => setFormData({...formData, implantSpec: {...formData.implantSpec, platform: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                              <option value="">Selecionar</option>
                              <option value="NP (Narrow)">NP (Narrow)</option>
                              <option value="RP (Regular)">RP (Regular)</option>
                              <option value="WP (Wide)">WP (Wide)</option>
                              <option value="GM 5.0mm">GM 5.0mm</option>
                              <option value="GM 6.0mm">GM 6.0mm</option>
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
                    ) : formData.category === 'Endodontia' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Tipo de Lima</label>
                            <select value={formData.endoSpec?.fileType || ''} onChange={e => setFormData({...formData, endoSpec: {...formData.endoSpec, fileType: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                              <option value="">Selecionar</option>
                              <option value="Manual">Manual</option>
                              <option value="Rotatória">Rotatória</option>
                              <option value="Reciprocante">Reciprocante</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Sistema/Linhagem</label>
                            <input type="text" value={formData.endoSpec?.fileSystem || ''} onChange={e => setFormData({...formData, endoSpec: {...formData.endoSpec, fileSystem: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm" placeholder="Ex: ProTaper Gold, K-File" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Calibre</label>
                            <input type="text" value={formData.endoSpec?.caliber || ''} onChange={e => setFormData({...formData, endoSpec: {...formData.endoSpec, caliber: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm" placeholder="Ex: 25" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Comprimento</label>
                            <select value={formData.endoSpec?.length || ''} onChange={e => setFormData({...formData, endoSpec: {...formData.endoSpec, length: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                              <option value="">Selecionar</option>
                              <option value="21mm">21mm</option>
                              <option value="25mm">25mm</option>
                              <option value="28mm">28mm</option>
                              <option value="31mm">31mm</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Conicidade</label>
                            <input type="text" value={formData.endoSpec?.taper || ''} onChange={e => setFormData({...formData, endoSpec: {...formData.endoSpec, taper: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm" placeholder="Ex: 4%, Variável" />
                          </div>
                        </div>
                      </div>
                    ) : formData.category === 'Cirurgia' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Tipo de Sutura</label>
                            <select value={formData.surgicalSpec?.sutureType || ''} onChange={e => setFormData({...formData, surgicalSpec: {...formData.surgicalSpec, sutureType: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                              <option value="">Selecionar</option>
                              <option value="Nylon">Nylon</option>
                              <option value="Seda">Seda</option>
                              <option value="Vicryl">Vicryl</option>
                              <option value="Catgut">Catgut</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Tamanho da Sutura</label>
                            <select value={formData.surgicalSpec?.sutureSize || ''} onChange={e => setFormData({...formData, surgicalSpec: {...formData.surgicalSpec, sutureSize: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                              <option value="">Selecionar</option>
                              <option value="3-0">3-0</option>
                              <option value="4-0">4-0</option>
                              <option value="5-0">5-0</option>
                              <option value="6-0">6-0</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Anestésico</label>
                            <input type="text" value={formData.surgicalSpec?.anestheticType || ''} onChange={e => setFormData({...formData, surgicalSpec: {...formData.surgicalSpec, anestheticType: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm" placeholder="Ex: Lidocaína, Mepivacaína" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Concentração</label>
                            <input type="text" value={formData.surgicalSpec?.anestheticConc || ''} onChange={e => setFormData({...formData, surgicalSpec: {...formData.surgicalSpec, anestheticConc: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm" placeholder="Ex: 2%, 3%" />
                          </div>
                        </div>
                      </div>
                    ) : formData.category === 'Periodontia' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Tipo de Material</label>
                          <select value={formData.perioSpec?.materialType || ''} onChange={e => setFormData({...formData, perioSpec: {...formData.perioSpec, materialType: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                            <option value="">Selecionar</option>
                            <option value="Enxerto ósseo">Enxerto ósseo</option>
                            <option value="Membrana reabsorvível">Membrana reabsorvível</option>
                            <option value="Membrana não-reabsorvível">Membrana não-reabsorvível</option>
                            <option value="Barreira de colágeno">Barreira de colágeno</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Origem do Enxerto</label>
                          <select value={formData.perioSpec?.graftOrigin || ''} onChange={e => setFormData({...formData, perioSpec: {...formData.perioSpec, graftOrigin: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                            <option value="">Selecionar</option>
                            <option value="Xenógeno">Xenógeno (Bovino, etc.)</option>
                            <option value="Alógeno">Alógeno (Humano)</option>
                            <option value="Sintético">Sintético</option>
                            <option value="Autógeno">Autógeno</option>
                          </select>
                        </div>
                      </div>
                    ) : formData.category === 'Prótese' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Tipo de Prótese</label>
                            <select value={formData.prostheticsSpec?.type || ''} onChange={e => setFormData({...formData, prostheticsSpec: {...formData.prostheticsSpec, type: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                              <option value="">Selecionar</option>
                              <option value="Coroa provisória">Coroa provisória</option>
                              <option value="Coroa definitiva">Coroa definitiva</option>
                              <option value="Faceta/Lente">Faceta/Lente</option>
                              <option value="Pilar/Abutment">Pilar/Abutment</option>
                              <option value="Prótese total">Prótese total</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Material</label>
                            <select value={formData.prostheticsSpec?.material || ''} onChange={e => setFormData({...formData, prostheticsSpec: {...formData.prostheticsSpec, material: e.target.value}})} className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                              <option value="">Selecionar</option>
                              <option value="Zircônia">Zircônia</option>
                              <option value="Emax/Dissilicato">Emax/Dissilicato</option>
                              <option value="Metalocerâmica">Metalocerâmica</option>
                              <option value="Resina Acrílica">Resina Acrílica</option>
                              <option value="PMMA">PMMA</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center space-y-2 opacity-50">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Sem especificações técnicas<br/>adicionais para esta categoria.</p>
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
