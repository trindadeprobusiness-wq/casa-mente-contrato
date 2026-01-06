import { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DocumentoViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nome: string;
  arquivoPath: string | null;
  getSignedUrl: (path: string) => Promise<string | null>;
  onDownload: (path: string, nome: string) => void;
}

export function DocumentoViewer({
  open,
  onOpenChange,
  nome,
  arquivoPath,
  getSignedUrl,
  onDownload,
}: DocumentoViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fileExtension = arquivoPath?.split('.').pop()?.toLowerCase() || '';
  const isPdf = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png'].includes(fileExtension);
  const isDoc = ['doc', 'docx'].includes(fileExtension);

  useEffect(() => {
    if (open && arquivoPath) {
      setLoading(true);
      setError(false);
      getSignedUrl(arquivoPath)
        .then((url) => {
          setSignedUrl(url);
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    } else {
      setSignedUrl(null);
    }
  }, [open, arquivoPath, getSignedUrl]);

  const handleDownload = () => {
    if (arquivoPath) {
      onDownload(arquivoPath, nome);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate">{nome}</span>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-[400px] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error || !signedUrl ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Não foi possível carregar o documento.
              </p>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Baixar documento
              </Button>
            </div>
          ) : isPdf ? (
            <iframe
              src={signedUrl}
              className="w-full h-full min-h-[500px] rounded-lg border"
              title={nome}
            />
          ) : isImage ? (
            <div className="flex items-center justify-center p-4">
              <img
                src={signedUrl}
                alt={nome}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          ) : isDoc ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="font-medium mb-2">Documento Word</p>
              <p className="text-sm text-muted-foreground mb-4">
                Não é possível visualizar documentos Word no navegador.
                <br />
                Baixe o arquivo para abrir no seu computador.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar documento
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(signedUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir em nova aba
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Formato não suportado para visualização.
              </p>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Baixar documento
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
