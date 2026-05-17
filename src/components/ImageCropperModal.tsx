import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  accentColor: string;
}

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  accentColor
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [useDuotone, setUseDuotone] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    applyDuotone: boolean,
    accentColor: string
  ) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    // Set canvas dimensions to the cropped size to be 512x512 finally
    canvas.width = 512;
    canvas.height = 512;

    // Draw cropped image onto the canvas
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      512,
      512
    );

    if (applyDuotone) {
      // Very simple "duotone" effect: convert to grayscale then tint
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert hex accent color to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      };
      
      const accentRgb = hexToRgb(accentColor);

      for (let i = 0; i < data.length; i += 4) {
        // grayscale
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const luminance = 0.299*r + 0.587*g + 0.114*b;

        // Apply tint: white stays white, black becomes accent color
        // This is a naive duotone mapping (black -> accent color, white -> white)
        data[i] = accentRgb.r + (255 - accentRgb.r) * (luminance / 255);
        data[i+1] = accentRgb.g + (255 - accentRgb.g) * (luminance / 255);
        data[i+2] = accentRgb.b + (255 - accentRgb.b) * (luminance / 255);
      }
      ctx.putImageData(imageData, 0, 0);
    }

    return canvas.toDataURL('image/png', 0.9);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, useDuotone, accentColor);
      if (croppedImage) {
        onCropComplete(croppedImage);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"
          >
            <div className="p-6 sm:p-8 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-xl font-black tracking-tight text-text-primary">Ajustar Ícone</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="relative w-full h-[300px] bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropCompleteHandler}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={false}
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Zoom</label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <label className="relative flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDuotone}
                    onChange={(e) => setUseDuotone(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                  <span className="text-sm font-bold text-text-primary">Aplicar Filtro Duotone</span>
                </label>
              </div>

            </div>

            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-bold text-sm text-text-secondary hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isProcessing}
                className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
              >
                {isProcessing ? (
                  'Processando...'
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Salvar Ícone
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
