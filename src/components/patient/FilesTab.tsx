import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../../firebase';
import { Patient, FileRecord } from '../../types';
import { Upload, FileImage, FileText, Trash2, Download, Eye, X, ZoomIn, ZoomOut, RotateCcw, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FilesTab = ({ patient }: { patient: Patient }) => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [zoom, setZoom] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [uploadType, setUploadType] = useState<FileRecord['type']>('intraoral');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'files'),
      where('patientId', '==', patient.id),
      where('dentistId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileRecord));
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

    try {
      // Compress image to fit in Firestore (1MB limit)
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 50);
          setUploadProgress(progress);
        }
      };

      reader.onloadend = async () => {
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

        let typeToSave = uploadType;
        
        await addDoc(collection(db, 'files'), {
          dentistId: auth.currentUser!.uid,
          patientId: patient.id,
          name: file.name,
          url: base64,
          type: typeToSave,
          uploadedAt: new Date().toISOString()
        });
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'files');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (file: FileRecord) => {
    if (window.confirm('Excluir este arquivo permanentemente?')) {
      try {
        await moveToTrash('files', file.id, file);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `files/${file.id}`);
      }
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Arquivos e Imagens</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Gerencie radiografias, fotos e documentos do paciente.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Tipo:</span>
            <select 
              value={uploadType} 
              onChange={(e) => setUploadType(e.target.value as any)}
              className="bg-transparent text-sm font-medium text-zinc-900 dark:text-white focus:outline-none"
            >
              <option value="intraoral">Foto Intraoral</option>
              <option value="extraoral">Foto Extraoral</option>
              <option value="xray">Radiografia</option>
              <option value="tomography">Tomografia</option>
              <option value="consent">Consentimento</option>
              <option value="audio">Áudio</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div className="relative flex-1 lg:flex-none">
            <input 
              type="file" 
              onChange={handleFileUpload} 
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              accept="image/*,.pdf,audio/*"
            />
            <button 
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 dark:shadow-none relative overflow-hidden"
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
                <><Upload className="w-5 h-5" /> Upload</>
              )}
            </button>
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
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredFiles.length === 0 ? (
          <div className="col-span-full p-16 text-center text-zinc-500 dark:text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/20">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 opacity-30" />
            </div>
            <p className="font-medium">Nenhum arquivo nesta categoria</p>
            <p className="text-sm mt-1 opacity-70">Faça upload de novos documentos usando o botão acima.</p>
          </div>
        ) : (
          filteredFiles.map(file => (
            <div key={file.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden group hover:shadow-md transition-all">
              <div 
                className="aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative cursor-pointer overflow-hidden"
                onClick={() => setSelectedFile(file)}
              >
                {file.url.startsWith('data:image') ? (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : file.url.startsWith('data:audio') ? (
                  <div className="w-full h-full flex items-center justify-center bg-amber-50 dark:bg-amber-500/10 text-amber-600">
                    <Music className="w-12 h-12" />
                  </div>
                ) : (
                  getIcon(file.type)
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="p-4 flex items-start justify-between gap-2">
                <div className="overflow-hidden">
                  <p className="font-medium text-sm text-zinc-900 dark:text-white truncate" title={file.name}>{file.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{file.type}</p>
                </div>
                <button 
                  onClick={() => handleDelete(file)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
                  >
                    <Download className="w-5 h-5" />
                  </a>
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
    </div>
  );
};
