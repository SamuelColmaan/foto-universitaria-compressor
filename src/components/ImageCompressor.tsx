
import React, { useState, useCallback } from 'react';
import { Upload, Download, Settings, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

interface CompressedImage {
  id: string;
  originalFile: File;
  compressedBlob?: Blob;
  originalSize: number;
  compressedSize?: number;
  preview: string;
}

const ImageCompressor = () => {
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState([80]);
  const [outputFormat, setOutputFormat] = useState('jpeg');
  const [maxWidth, setMaxWidth] = useState(1920);
  const [maxHeight, setMaxHeight] = useState(1080);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const { toast } = useToast();

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const id = Math.random().toString(36).substr(2, 9);
        const preview = URL.createObjectURL(file);
        
        setImages(prev => [...prev, {
          id,
          originalFile: file,
          originalSize: file.size,
          preview
        }]);
      }
    });
  }, []);

  const compressImage = useCallback((file: File, quality: number, maxWidth: number, maxHeight: number, format: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions
        if (maintainAspectRatio) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          if (ratio < 1) {
            width *= ratio;
            height *= ratio;
          }
        } else {
          width = maxWidth;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, `image/${format}`, quality / 100);
      };

      img.src = URL.createObjectURL(file);
    });
  }, [maintainAspectRatio]);

  const handleCompress = async () => {
    setIsProcessing(true);
    
    try {
      const compressedImages = await Promise.all(
        images.map(async (img) => {
          if (!img.compressedBlob) {
            const compressed = await compressImage(
              img.originalFile,
              quality[0],
              maxWidth,
              maxHeight,
              outputFormat
            );
            
            return {
              ...img,
              compressedBlob: compressed,
              compressedSize: compressed.size
            };
          }
          return img;
        })
      );

      setImages(compressedImages);
      toast({
        title: "Compressão concluída!",
        description: `${images.length} imagem(ns) processada(s) com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro na compressão",
        description: "Ocorreu um erro ao comprimir as imagens.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (image: CompressedImage) => {
    if (!image.compressedBlob) return;

    const url = URL.createObjectURL(image.compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${image.originalFile.name.split('.')[0]}.${outputFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    images.forEach(image => {
      if (image.compressedBlob) {
        setTimeout(() => handleDownload(image), 100);
      }
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateSavings = (original: number, compressed?: number) => {
    if (!compressed) return 0;
    return Math.round(((original - compressed) / original) * 100);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <ImageIcon className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">Compressor de Imagens</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Comprima múltiplas imagens simultaneamente com controle total sobre qualidade e dimensões
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Upload de Imagens</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <Label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center space-y-4"
            >
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Clique para selecionar imagens</p>
                <p className="text-sm text-muted-foreground">ou arraste e solte aqui</p>
              </div>
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configurações de Compressão</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label>Qualidade: {quality[0]}%</Label>
              <Slider
                value={quality}
                onValueChange={setQuality}
                max={100}
                min={10}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Formato de Saída</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="width">Largura Máxima (px)</Label>
              <Input
                id="width"
                type="number"
                value={maxWidth}
                onChange={(e) => setMaxWidth(Number(e.target.value))}
                min={100}
                max={4000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Altura Máxima (px)</Label>
              <Input
                id="height"
                type="number"
                value={maxHeight}
                onChange={(e) => setMaxHeight(Number(e.target.value))}
                min={100}
                max={4000}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="aspect-ratio"
              checked={maintainAspectRatio}
              onChange={(e) => setMaintainAspectRatio(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="aspect-ratio">Manter proporção original</Label>
          </div>

          <div className="flex space-x-4">
            <Button
              onClick={handleCompress}
              disabled={images.length === 0 || isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processando...' : 'Comprimir Imagens'}
            </Button>

            <Button
              onClick={handleDownloadAll}
              variant="outline"
              disabled={images.filter(img => img.compressedBlob).length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Todas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Images Preview */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Imagens ({images.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <div key={image.id} className="border rounded-lg p-4 space-y-3">
                  <div className="relative">
                    <img
                      src={image.preview}
                      alt={image.originalFile.name}
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      onClick={() => removeImage(image.id)}
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1 text-sm">
                    <p className="font-medium truncate">{image.originalFile.name}</p>
                    <p className="text-muted-foreground">
                      Original: {formatFileSize(image.originalSize)}
                    </p>
                    {image.compressedSize && (
                      <>
                        <p className="text-muted-foreground">
                          Comprimido: {formatFileSize(image.compressedSize)}
                        </p>
                        <p className="text-green-600 font-medium">
                          Economia: {calculateSavings(image.originalSize, image.compressedSize)}%
                        </p>
                      </>
                    )}
                  </div>

                  {image.compressedBlob && (
                    <Button
                      onClick={() => handleDownload(image)}
                      size="sm"
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImageCompressor;
