'use client';
import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';

interface ImageCropperModalProps {
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedImageBlob: Blob) => void;
}

export default function ImageCropperModal({
  imageSrc,
  onClose,
  onCropComplete,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Não foi possível criar o contexto do canvas');
    }

    // Definir tamanho do canvas igual ao crop
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Desenhar a imagem cortada
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Canvas está vazio'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteCallback = useCallback(
    async (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
      // Gerar preview
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        const url = URL.createObjectURL(croppedImage);
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (error) {
        console.error('Erro ao gerar preview:', error);
      }
    },
    [imageSrc]
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      // Limpar preview URL anterior se existir
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      onCropComplete(croppedImage);
      onClose();
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
    }
  };

  // Limpar preview URL ao desmontar
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
      <div className="bg-[#2c2e31] rounded-xl p-4 sm:p-6 w-full max-w-5xl mx-auto max-h-[95vh] overflow-auto shadow-2xl border border-[#3a3c3f]">
        <div className="flex justify-between items-start mb-4 sm:mb-6">
          <div className="flex-1 pr-2">
            <h2 className="text-white text-xl sm:text-2xl font-bold">Ajustar Foto de Perfil</h2>
            <p className="text-[#d1d1d1] text-xs sm:text-sm mt-1">Arraste para reposicionar e ajuste o zoom</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#d1d1d1] hover:text-white text-3xl font-bold w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-[#1f2022] transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Área de Crop - Ocupa 2 colunas */}
          <div className="lg:col-span-2 order-1">
            <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] bg-[#1f2022] rounded-lg overflow-hidden border border-[#3a3c3f]">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={onCropChange}
                onZoomChange={onZoomChange}
                onCropComplete={onCropCompleteCallback}
                cropShape="round"
                showGrid={false}
              />
            </div>

            {/* Controles de Zoom */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[#d1d1d1] text-xs sm:text-sm font-medium">Zoom</label>
                <span className="text-[#e2b714] font-semibold text-sm sm:text-base">{Math.round(zoom * 100)}%</span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-[#1f2022] text-white rounded-lg hover:bg-[#323437] transition-colors border border-[#3a3c3f] font-bold text-lg sm:text-xl flex-shrink-0"
                  aria-label="Diminuir zoom"
                >
                  −
                </button>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="flex-1 h-2 cursor-pointer"
                />
                <button
                  onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-[#1f2022] text-white rounded-lg hover:bg-[#323437] transition-colors border border-[#3a3c3f] font-bold text-lg sm:text-xl flex-shrink-0"
                  aria-label="Aumentar zoom"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Preview e Ações - Ocupa 1 coluna */}
          <div className="lg:col-span-1 space-y-4 order-2">
            <div className="bg-[#1f2022] rounded-lg p-4 sm:p-6 border border-[#3a3c3f]">
              <h3 className="text-white font-semibold mb-4 text-center text-sm sm:text-base">Preview Final</h3>
              {previewUrl ? (
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 mb-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full rounded-full object-cover border-4 border-[#e2b714] shadow-lg"
                    />
                  </div>
                  <p className="text-[#d1d1d1] text-xs text-center">
                    Esta é como sua foto aparecerá no perfil
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 sm:h-40">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[#323437] border-2 border-dashed border-[#3a3c3f] flex items-center justify-center">
                    <span className="text-[#6b6e70] text-xs sm:text-sm">Ajustando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="space-y-3">
              <button
                onClick={handleConfirm}
                disabled={!croppedAreaPixels}
                className="w-full px-6 py-3 sm:py-2.5 bg-[#e2b714] text-black rounded-lg hover:bg-[#d4c013] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none text-sm sm:text-base min-h-[44px]"
              >
                Confirmar e Salvar
              </button>
              <button
                onClick={onClose}
                className="w-full px-6 py-3 sm:py-2.5 bg-[#1f2022] text-white rounded-lg hover:bg-[#323437] transition-colors border border-[#3a3c3f] text-sm sm:text-base min-h-[44px]"
              >
                Cancelar
              </button>
            </div>

            {/* Dicas */}
            <div className="bg-[#1f2022] rounded-lg p-3 sm:p-4 border border-[#3a3c3f]">
              <p className="text-[#d1d1d1] text-xs leading-relaxed">
                <span className="text-[#e2b714] font-semibold">💡 Dica:</span> Use os botões + e -
                ou o slider para ajustar o zoom. Arraste a imagem para reposicioná-la.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
