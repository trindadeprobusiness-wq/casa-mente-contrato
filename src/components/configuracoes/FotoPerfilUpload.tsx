import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface FotoPerfilUploadProps {
  fotoUrl?: string;
  nome: string;
  onFotoChange: (fotoBase64: string) => void;
}

export function FotoPerfilUpload({ fotoUrl, nome, onFotoChange }: FotoPerfilUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem (JPG, PNG ou GIF).',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onFotoChange(base64);
      toast({
        title: 'Foto atualizada',
        description: 'A foto de perfil foi alterada com sucesso.',
      });
    };
    reader.readAsDataURL(file);
  }, [onFotoChange, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemovePhoto = () => {
    setPreview(null);
    onFotoChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const currentPhoto = preview || fotoUrl;

  return (
    <div className="flex items-center gap-6">
      <div
        className={`relative group cursor-pointer transition-all ${
          isDragging ? 'scale-105' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Avatar className={`h-24 w-24 ring-2 transition-all ${
          isDragging 
            ? 'ring-primary ring-offset-2' 
            : 'ring-border ring-offset-background'
        }`}>
          <AvatarImage src={currentPhoto} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {nome ? getInitials(nome) : <User className="h-10 w-10" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-8 w-8 text-white" />
        </div>

        {currentPhoto && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              handleRemovePhoto();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Alterar foto
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG ou GIF. Máx 2MB.
        </p>
        <p className="text-xs text-muted-foreground">
          Arraste uma imagem para alterar.
        </p>
      </div>
    </div>
  );
}
