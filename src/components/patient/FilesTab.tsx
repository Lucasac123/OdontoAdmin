import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../../firebase';
import { Patient, FileRecord } from '../../types';
import { Upload, FileImage, FileText, Trash2, Download, Eye, X, ZoomIn, ZoomOut, RotateCcw, Music, Clock, Calendar, Printer, Link as LinkIcon, ExternalLink, Box, Activity as DicomIcon, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../ConfirmModal';
import { useSync } from '../../context/SyncContext';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import daikon from 'daikon';

// Helper to render STL Object
const STLModel = ({ geometry }: { geometry: THREE.BufferGeometry }) => {
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.2} />
    </mesh>
  );
};

export const FilesTab = ({ patient }: { patient: Patient }) => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [zoom, setZoom] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [uploadType, setUploadType] = useState<FileRecord['type']>('intraoral');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expirationDays, setExpirationDays] = useState<string>('0');
  const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [stlGeometry, setStlGeometry] = useState<THREE.BufferGeometry | null>(null);
  const { addSyncTask } = useSync();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'files'),
      where('patientId', '==', patient.id),
      where('dentistId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileRecord));
      
      // Auto-deletion logic: check for expired files
      const now = new Date();
      const expiredFiles = data.filter(f => f.expiresAt && new Date(f.expiresAt) < now);
      
      if (expiredFiles.length > 0) {
        const batch = writeBatch(db);
        expiredFiles.forEach(f => {
          batch.delete(doc(db, 'files', f.id));
        });
        try {
          await batch.commit();
          // The snapshot will update again after commit
        } catch (error) {
          console.error("Error deleting expired files:", error);
        }
      }

      data.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setFiles(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'files'));

    return () => unsubscribe();
  }, [patient.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    setUploadProgress(0);

    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 50);
        setUploadProgress(progress);
      }
    };

    reader.onloadend = async () => {
      try {
        setUploadProgress(60);
        let base64 = reader.result as string;
        const fileName = file.name.toLowerCase();
        
        // Detection for advanced types
        const isSTL = fileName.endsWith('.stl');
        const isDICOM = fileName.endsWith('.dcm') || file.type === 'application/dicom';
        
        // Basic compression for images
        if (file.type.startsWith('image/') && !isDICOM) {
          const img = new Image();
          img.src = base64;
          await new Promise(resolve => {
            img.onload = () => {
              setUploadProgress(70);
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              const scaleSize = MAX_WIDTH / img.width;
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              base64 = canvas.toDataURL('image/jpeg', 0.7);
              setUploadProgress(85);
              resolve(null);
            };
          });
        }

        if (base64.length > 2000000) { // Increased limit for DICOM/STL
          alert("O arquivo é muito grande. O tamanho máximo permitido para bases de dados é de aproximadamente 2MB.");
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }

        let typeToSave = uploadType;
        // Auto-assign type if recognized
        if (isSTL) typeToSave = 'other';
        if (isDICOM) typeToSave = 'tomography';

        const now = new Date();
        let expiresAt: string | null = null;
        
        if (expirationDays !== '0') {
          const expirationDate = new Date(now);
          expirationDate.setDate(now.getDate() + parseInt(expirationDays));
          expiresAt = expirationDate.toISOString();
        }
        
        await addDoc(collection(db, 'files'), {
          dentistId: auth.currentUser!.uid,
          patientId: patient.id,
          name: file.name,
          url: base64,
          type: typeToSave,
          uploadedAt: now.toISOString(),
          ...(expiresAt && { expiresAt })
        });
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      } catch (error) {
        console.error(error);
        setIsUploading(false);
        setUploadProgress(0);
        handleFirestoreError(error, OperationType.CREATE, 'files');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkName || !linkUrl || !auth.currentUser) return;
    
    const now = new Date();
    let expiresAt: string | null = null;
    if (expirationDays !== '0') {
      const expirationDate = new Date(now);
      expirationDate.setDate(now.getDate() + parseInt(expirationDays));
      expiresAt = expirationDate.toISOString();
    }

    const savePromise = addDoc(collection(db, 'files'), {
      dentistId: auth.currentUser.uid,
      patientId: patient.id,
      name: linkName,
      url: linkUrl,
      type: uploadType,
      uploadedAt: now.toISOString(),
      isLink: true,
      ...(expiresAt && { expiresAt })
    }).catch(error => {
      handleFirestoreError(error, OperationType.CREATE, 'files');
    });

    addSyncTask(savePromise);
    setIsLinkModalOpen(false);
    setLinkName('');
    setLinkUrl('');
  };

  const handleDelete = async (file: FileRecord) => {
    setFileToDelete(file);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    
    try {
      await moveToTrash('files', fileToDelete.id, fileToDelete);
      setFileToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir arquivo:", error);
      handleFirestoreError(error, OperationType.DELETE, `files/${fileToDelete.id}`);
    }
  };

  const handlePrintFile = (file: FileRecord) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${file.name}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              img { max-width: 100%; }
            </style>
          </head>
          <body>
            <img src="${file.url}" referrerPolicy="no-referrer" />
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const getIcon = (type: string, name?: string) => {
    const fileName = name?.toLowerCase() || '';
    if (fileName.endsWith('.stl')) return <Box className="w-8 h-8 text-blue-500" />;
    if (fileName.endsWith('.dcm')) return <DicomIcon className="w-8 h-8 text-indigo-500" />;

    switch (type) {
      case 'consent': return <FileText className="w-8 h-8 text-blue-500" />;
      case 'xray':
      case 'tomography': return <FileImage className="w-8 h-8 text-purple-500" />;
      case 'audio': return <Music className="w-8 h-8 text-amber-500" />;
      default: return <FileImage className="w-8 h-8 text-emerald-500" />;
    }
  };

  const filteredFiles = files.filter(f => filterType === 'all' || f.type === filterType);

  return (
    <div className="space-y-6">
      <div className="bg-surface p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <FileImage className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Arquivos e Imagens
            </h2>
            <p className="text-sm text-text-secondary">Gerencie radiografias, fotos e documentos do paciente.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none min-w-[140px]">
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 ml-1">Tipo de Arquivo</label>
              <select 
                value={uploadType} 
                onChange={(e) => setUploadType(e.target.value as any)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm font-medium text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="intraoral">Foto Intraoral</option>
                <option value="extraoral">Foto Extraoral</option>
                <option value="xray">Radiografia</option>
                <option value="tomography">Tomografia</option>
                <option value="consent">Termo de Consentimento</option>
                <option value="audio">Áudio</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div className="flex-1 lg:flex-none min-w-[140px]">
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 ml-1">Expiração</label>
              <select 
                value={expirationDays} 
                onChange={(e) => setExpirationDays(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm font-medium text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="0">Nunca expira</option>
                <option value="7">7 dias</option>
                <option value="30">30 dias</option>
                <option value="90">90 dias</option>
                <option value="365">1 ano</option>
              </select>
            </div>

            <div className="flex gap-2 w-full lg:w-auto lg:pt-5">
              <button 
                onClick={() => setIsLinkModalOpen(true)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-text-primary px-4 py-2.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all font-medium text-sm"
              >
                <LinkIcon className="w-4 h-4" /> Link
              </button>
              <div className="relative flex-1 lg:flex-none">
                <input 
                  type="file" 
                  onChange={handleFileUpload} 
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                  accept="image/*,.pdf,audio/*,.stl,.dcm,application/dicom"
                />
                <button 
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 dark:shadow-none relative overflow-hidden text-sm font-medium"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-xs font-medium">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-white"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  ) : (
                    <><Upload className="w-4 h-4" /> Upload</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'intraoral', label: 'Intraoral' },
          { id: 'extraoral', label: 'Extraoral' },
          { id: 'xray', label: 'Raio-X' },
          { id: 'tomography', label: 'Tomografia' },
          { id: 'consent', label: 'Termos' },
          { id: 'audio', label: 'Áudios' },
          { id: 'other', label: 'Outros' }
        ].map((type) => (
            <button
            key={type.id}
            onClick={() => setFilterType(type.id)}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap border ${
              filterType === type.id
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-lg'
                : 'bg-surface text-text-secondary border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredFiles.length === 0 ? (
          <div className="col-span-full p-16 text-center text-text-secondary border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-surface">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 opacity-30" />
            </div>
            <p className="font-medium">Nenhum arquivo nesta categoria</p>
            <p className="text-sm mt-1 opacity-70">Faça upload de novos documentos usando o botão acima.</p>
          </div>
        ) : (
          filteredFiles.map(file => (
            <div key={file.id} className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden group hover:shadow-md transition-all">
              <div 
                className="aspect-square bg-surface flex items-center justify-center relative cursor-pointer overflow-hidden"
                onClick={() => file.isLink ? window.open(file.url, '_blank') : setSelectedFile(file)}
              >
                {file.isLink ? (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600">
                    <LinkIcon className="w-12 h-12" />
                  </div>
                ) : file.url.startsWith('data:image') ? (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                ) : file.url.startsWith('data:audio') ? (
                  <div className="w-full h-full flex items-center justify-center bg-amber-50 dark:bg-amber-500/10 text-amber-600">
                    <Music className="w-12 h-12" />
                  </div>
                ) : (
                  getIcon(file.type, file.name)
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  {file.isLink ? (
                    <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
              <div className="p-4 flex items-start justify-between gap-2">
                <div className="overflow-hidden">
                  <p className="font-medium text-sm text-text-primary truncate" title={file.name}>{file.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-text-secondary capitalize">{file.type}</p>
                    {file.expiresAt && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>Expira {new Date(file.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!file.isLink && (
                    <a 
                      href={file.url} 
                      download={file.name}
                      className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                      title="Download"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 md:p-8"
            onClick={() => setSelectedFile(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-6xl w-full max-h-[90vh] flex flex-col bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
                <div className="flex flex-col overflow-hidden">
                  <h3 className="text-white font-medium truncate pr-4">{selectedFile.name}</h3>
                  <p className="text-xs text-zinc-500 uppercase">{selectedFile.type}</p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  {selectedFile.url.startsWith('data:image') && (
                    <div className="flex items-center gap-1 bg-zinc-800 rounded-xl p-1 mr-2">
                      <button 
                        onClick={handleZoomOut}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                        title="Diminuir Zoom"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-mono text-zinc-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                      <button 
                        onClick={handleZoomIn}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                        title="Aumentar Zoom"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleResetZoom}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                        title="Redefinir Zoom"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <a 
                    href={selectedFile.url} 
                    download={selectedFile.name}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  <button 
                    onClick={() => handlePrintFile(selectedFile)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                    title="Imprimir"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedFile(null);
                      setZoom(1);
                    }}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px] bg-zinc-950/50">
                {selectedFile.url.startsWith('data:image') ? (
                  <div className="relative transition-transform duration-200 ease-out" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
                    <img 
                      src={selectedFile.url} 
                      alt={selectedFile.name} 
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : selectedFile.url.startsWith('data:audio') ? (
                  <div className="w-full max-w-md p-6 bg-zinc-800 rounded-2xl">
                    <audio controls src={selectedFile.url} className="w-full" />
                  </div>
                ) : selectedFile.url.startsWith('data:application/pdf') ? (
                  <iframe 
                    src={selectedFile.url} 
                    title={selectedFile.name}
                    className="w-full h-[70vh] rounded-lg bg-white"
                  />
                ) : selectedFile.name.toLowerCase().endsWith('.stl') ? (
                  <div className="w-full h-[70vh] rounded-lg bg-zinc-950 overflow-hidden relative">
                    <Canvas 
                      onCreated={({ gl }) => {
                        const loader = new STLLoader();
                        const buffer = Uint8Array.from(atob(selectedFile.url.split(',')[1]), c => c.charCodeAt(0)).buffer;
                        const geometry = loader.parse(buffer);
                        geometry.center();
                        setStlGeometry(geometry);
                      }}
                      camera={{ position: [0, 0, 100], fov: 50 }}
                    >
                      <color attach="background" args={['#09090b']} />
                      <ambientLight intensity={0.5} />
                      <directionalLight position={[10, 10, 10]} intensity={1} />
                      {stlGeometry && (
                        <Stage environment="city" intensity={0.5}>
                          <STLModel geometry={stlGeometry} />
                        </Stage>
                      )}
                      <OrbitControls makeDefault />
                    </Canvas>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full pointer-events-none">
                      <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">Visualização 3D Interativa</p>
                    </div>
                  </div>
                ) : selectedFile.name.toLowerCase().endsWith('.dcm') ? (
                   <div className="w-full h-[70vh] flex items-center justify-center p-4 bg-black rounded-lg">
                      <canvas 
                        ref={canvas => {
                          if (canvas && selectedFile) {
                            try {
                              const base64 = selectedFile.url.split(',')[1];
                              const binary = atob(base64);
                              const array = new Uint8Array(binary.length);
                              for(let i=0; i<binary.length; i++) array[i] = binary.charCodeAt(i);
                              const data = new DataView(array.buffer);
                              // @ts-ignore
                              const image = daikon.Series.parseImage(data);
                              if (image) {
                                const cols = image.getCols();
                                const rows = image.getRows();
                                canvas.width = cols;
                                canvas.height = rows;
                                const ctx = canvas.getContext('2d');
                                const imageData = ctx!.createImageData(cols, rows);
                                const pixels = image.getInterpretedData();
                                let min = Infinity; let max = -Infinity;
                                for(let i=0; i<pixels.length; i++) {
                                  if (pixels[i] < min) min = pixels[i];
                                  if (pixels[i] > max) max = pixels[i];
                                }
                                for (let i = 0; i < pixels.length; i++) {
                                  const val = ((pixels[i] - Math.min(min, 0)) / (max - Math.min(min, 0))) * 255;
                                  const index = i * 4;
                                  imageData.data[index] = val;
                                  imageData.data[index + 1] = val;
                                  imageData.data[index + 2] = val;
                                  imageData.data[index + 3] = 255;
                                }
                                ctx!.putImageData(imageData, 0, 0);
                              }
                            } catch (e) {
                              console.error("DICOM Load Error", e);
                            }
                          }
                        }}
                        className="max-w-full max-h-full object-contain shadow-2xl"
                      />
                   </div>
                ) : (
                  <div className="text-center text-zinc-400">
                    <FileText className="w-24 h-24 mx-auto mb-4 opacity-50" />
                    <p>Pré-visualização não disponível para este tipo de arquivo.</p>
                    <a href={selectedFile.url} download={selectedFile.name} className="text-indigo-400 hover:underline mt-2 inline-block">Fazer Download</a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!fileToDelete}
        title="Excluir Arquivo"
        message={`Tem certeza que deseja excluir o arquivo "${fileToDelete?.name}"? Ele será movido para a lixeira.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setFileToDelete(null)}
        variant="danger"
      />

      <AnimatePresence>
        {isLinkModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-text-primary">Adicionar Link Externo</h3>
                <button onClick={() => setIsLinkModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddLink} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Nome do Arquivo/Link</label>
                  <input
                    type="text"
                    required
                    disabled={isSaving}
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="Ex: Tomografia Panorâmica"
                    className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">URL (Link do Drive, OneDrive, etc.)</label>
                  <input
                    type="url"
                    required
                    disabled={isSaving}
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setIsLinkModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    Salvar Link
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
