import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../../firebase';
import { Patient, FileRecord } from '../../types';
import { Upload, FileImage, FileText, Trash2, Download, Eye, X, ZoomIn, ZoomOut, RotateCcw, Music, Clock, Calendar, Printer, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../ConfirmModal';

export const FilesTab = ({ patient }: { patient: Patient }) => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
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
        
        // Basic compression for images
        if (file.type.startsWith('image/')) {
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

        if (base64.length > 1000000) {
          alert("O arquivo é muito grande. O tamanho máximo permitido é de aproximadamente 700KB.");
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }

        let typeToSave = uploadType;
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

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkName || !linkUrl || !auth.currentUser) return;
    
    try {
      const now = new Date();
      let expiresAt: string | null = null;
      if (expirationDays !== '0') {
        const expirationDate = new Date(now);
        expirationDate.setDate(now.getDate() + parseInt(expirationDays));
        expiresAt = expirationDate.toISOString();
      }

      await addDoc(collection(db, 'files'), {
        dentistId: auth.currentUser.uid,
        patientId: patient.id,
        name: linkName,
        url: linkUrl,
        type: uploadType,
        uploadedAt: now.toISOString(),
        isLink: true,
        ...(expiresAt && { expiresAt })
      });
      setIsLinkModalOpen(false);
      setLinkName('');
      setLinkUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'files');
    }
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
            <img src="${file.url}" />
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

  const getIcon = (type: string) => {
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-surface p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-text-primary">Arquivos e Imagens</h2>
          <p className="text-sm text-text-secondary">Gerencie radiografias, fotos e documentos do paciente.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2">
            <span className="text-xs font-medium text-text-secondary uppercase">Tipo:</span>
            <select 
              value={uploadType} 
              onChange={(e) => setUploadType(e.target.value as any)}
              className="bg-transparent text-sm font-medium text-text-primary focus:outline-none"
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

          <div className="flex items-center gap-2 bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2">
            <Clock className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-xs font-medium text-text-secondary uppercase">Expira em:</span>
            <select 
              value={expirationDays} 
              onChange={(e) => setExpirationDays(e.target.value)}
              className="bg-transparent text-sm font-medium text-text-primary focus:outline-none"
            >
              <option value="0">Nunca</option>
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="90">90 dias</option>
              <option value="365">1 ano</option>
            </select>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <button 
              onClick={() => setIsLinkModalOpen(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-surface border border-zinc-200 dark:border-zinc-700 text-text-primary px-4 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all font-medium text-sm"
            >
              <LinkIcon className="w-4 h-4" /> Adicionar Link
            </button>
            <div className="relative flex-1 lg:flex-none">
              <input 
                type="file" 
                onChange={handleFileUpload} 
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                accept="image/*,.pdf,audio/*"
              />
              <button 
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 dark:shadow-none relative overflow-hidden text-sm font-medium"
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-sm font-medium">{uploadProgress}%</span>
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

      <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {['all', 'intraoral', 'extraoral', 'xray', 'tomography', 'consent', 'audio', 'other'].map((type) => (
            <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              filterType === type
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md'
                : 'bg-surface text-text-secondary border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : file.url.startsWith('data:audio') ? (
                  <div className="w-full h-full flex items-center justify-center bg-amber-50 dark:bg-amber-500/10 text-amber-600">
                    <Music className="w-12 h-12" />
                  </div>
                ) : (
                  getIcon(file.type)
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
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-mono text-zinc-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                      <button 
                        onClick={handleZoomIn}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleResetZoom}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                        title="Reset Zoom"
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
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="Ex: Tomografia Panorâmica"
                    className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">URL (Link do Drive, OneDrive, etc.)</label>
                  <input
                    type="url"
                    required
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsLinkModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
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
