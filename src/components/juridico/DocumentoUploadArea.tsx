import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Cliente {
  id: string;
  nome: string;
}

interface DocumentoUploadAreaProps {
  clientes: Cliente[];
  uploading: boolean;
  onUpload: (
    file: File,
    nome: string,
    tipo: string,
    clienteId?: string,
    dataValidade?: string
  ) => Promise<void>;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
const MAX_SIZE_MB = 10;

const TIPOS_DOCUMENTO = [
  { value: 'RG', label: 'RG' },
  { value: 'CPF', label: 'CPF' },
  { value: 'COMPROVANTE_RESIDENCIA', label: 'Comprovante de Residência' },
  { value: 'COMPROVANTE_RENDA', label: 'Comprovante de Renda' },
  { value: 'CERTIDAO_CASAMENTO', label: 'Certidão de Casamento' },
  { value: 'ESCRITURA', label: 'Escritura' },
  { value: 'MATRICULA', label: 'Matrícula do Imóvel' },
  { value: 'IPTU', label: 'IPTU' },
  { value: 'CONTRATO', label: 'Contrato' },
  { value: 'OUTRO', label: 'Outro' },
];

export function DocumentoUploadArea({
  clientes,
  uploading,
  onUpload,
}: DocumentoUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [clienteId, setClienteId] = useState<string>('');
  const [dataValidade, setDataValidade] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Formato não permitido. Use: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo: ${MAX_SIZE_MB}MB`);
      return false;
    }

    return true;
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        if (!nome) {
          setNome(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    }
  }, [nome]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        if (!nome) {
          setNome(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo');
      return;
    }

    if (!nome.trim()) {
      toast.error('Digite um nome para o documento');
      return;
    }

    if (!tipo) {
      toast.error('Selecione o tipo do documento');
      return;
    }

    try {
      await onUpload(
        selectedFile,
        nome.trim(),
        tipo,
        clienteId || undefined,
        dataValidade || undefined
      );

      // Reset form
      setSelectedFile(null);
      setNome('');
      setTipo('');
      setClienteId('');
      setDataValidade('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error) {
      // Error already handled in hook
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="py-6">
        {/* Drop Zone */}
        <div
          className={cn(
            'flex flex-col items-center justify-center text-center p-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            selectedFile && 'border-success bg-success/5'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !selectedFile && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileSelect}
          />

          {selectedFile ? (
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-success" />
              <div className="text-left">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-medium mb-1">
                {isDragging ? 'Solte o arquivo aqui' : 'Arraste documentos aqui'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Formatos aceitos: PDF, JPG, PNG, DOC, DOCX (máx. {MAX_SIZE_MB}MB)
              </p>
              <Button variant="outline" type="button">
                Selecionar Arquivo
              </Button>
            </>
          )}
        </div>

        {/* Form Fields */}
        {selectedFile && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Documento *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: RG João Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Documento *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente (opcional)</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Associar a cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validade">Data de Validade (opcional)</Label>
                <Input
                  id="validade"
                  type="date"
                  value={dataValidade}
                  onChange={(e) => setDataValidade(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={clearFile} disabled={uploading}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Documento'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
