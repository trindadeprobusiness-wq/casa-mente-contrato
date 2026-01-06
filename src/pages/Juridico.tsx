import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, AlertTriangle, Plus, Download, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GerarContratoDialog } from '@/components/juridico/GerarContratoDialog';
import { DocumentoUploadArea } from '@/components/juridico/DocumentoUploadArea';
import { DocumentoViewer } from '@/components/juridico/DocumentoViewer';
import { useDocumentos, DocumentoRow } from '@/hooks/useDocumentos';
import { useCRMStore } from '@/stores/crmStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ClienteSimples {
  id: string;
  nome: string;
}

export default function Juridico() {
  const { contratos, clientes: clientesStore } = useCRMStore();
  const {
    documentos,
    loading,
    uploading,
    uploadDocumento,
    deleteDocumento,
    getSignedUrl,
    downloadDocumento,
  } = useDocumentos();

  const [contratoDialogOpen, setContratoDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentoRow | null>(null);
  const [clientes, setClientes] = useState<ClienteSimples[]>([]);

  // Fetch clientes from Supabase
  useEffect(() => {
    const fetchClientes = async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome');
      if (data) {
        setClientes(data);
      }
    };
    fetchClientes();
  }, []);

  const getDocumentoStatus = (doc: DocumentoRow) => {
    if (!doc.data_validade) {
      return doc.validado ? 'validado' : 'pendente';
    }
    const days = differenceInDays(new Date(doc.data_validade), new Date());
    if (days < 0) return 'vencido';
    if (days <= 7) return 'vencendo';
    return 'validado';
  };

  const getClienteNome = (clienteId?: string | null) => {
    if (!clienteId) return 'Sem cliente';
    const cliente = clientes.find((c) => c.id === clienteId);
    return cliente?.nome || 'Desconhecido';
  };

  const handleView = (doc: DocumentoRow) => {
    setSelectedDoc(doc);
    setViewerOpen(true);
  };

  const handleDownload = (doc: DocumentoRow) => {
    if (doc.arquivo_path) {
      downloadDocumento(doc.arquivo_path, doc.nome);
    }
  };

  const handleDeleteClick = (doc: DocumentoRow) => {
    setDocToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (docToDelete) {
      await deleteDocumento(docToDelete.id, docToDelete.arquivo_path);
      setDeleteDialogOpen(false);
      setDocToDelete(null);
    }
  };

  const handleUpload = async (
    file: File,
    nome: string,
    tipo: string,
    clienteId?: string,
    dataValidade?: string
  ) => {
    await uploadDocumento(file, nome, tipo, clienteId, undefined, dataValidade);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Jurídico</h1>
          <p className="text-muted-foreground">
            Gerencie documentos e contratos
          </p>
        </div>
        <Button onClick={() => setContratoDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Gerar Contrato com IA
        </Button>
      </div>

      <Tabs defaultValue="documentos">
        <TabsList>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="contratos" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Contratos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="space-y-6 mt-6">
          {/* Upload Area */}
          <DocumentoUploadArea
            clientes={clientes}
            uploading={uploading}
            onUpload={handleUpload}
          />

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documentos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div>
                          <Skeleton className="h-4 w-40 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : documentos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum documento cadastrado ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {documentos.map((doc) => {
                    const status = getDocumentoStatus(doc);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2 rounded-lg',
                            status === 'validado' && 'bg-success/10',
                            status === 'vencendo' && 'bg-warning/10',
                            status === 'vencido' && 'bg-destructive/10',
                            status === 'pendente' && 'bg-muted'
                          )}>
                            {status === 'validado' && <CheckCircle className="w-5 h-5 text-success" />}
                            {status === 'vencendo' && <AlertTriangle className="w-5 h-5 text-warning" />}
                            {status === 'vencido' && <AlertTriangle className="w-5 h-5 text-destructive" />}
                            {status === 'pendente' && <Clock className="w-5 h-5 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className="font-medium">{doc.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {getClienteNome(doc.cliente_id)} •{' '}
                              {doc.created_at && format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {status === 'vencendo' && doc.data_validade && (
                            <Badge variant="outline" className="text-warning border-warning">
                              Vence em {differenceInDays(new Date(doc.data_validade), new Date())} dias
                            </Badge>
                          )}
                          {status === 'vencido' && (
                            <Badge variant="destructive">Vencido</Badge>
                          )}
                          {doc.arquivo_path && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(doc)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(doc)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contratos" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contratos Gerados</CardTitle>
            </CardHeader>
            <CardContent>
              {contratos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-medium mb-1">Nenhum contrato gerado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use nossa IA para gerar contratos automaticamente
                  </p>
                  <Button onClick={() => setContratoDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Gerar Primeiro Contrato
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {contratos.map((contrato) => (
                    <div
                      key={contrato.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{contrato.tipo}</p>
                        <p className="text-sm text-muted-foreground">
                          {getClienteNome(contrato.cliente_id)} •{' '}
                          {format(new Date(contrato.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={contrato.status === 'FINALIZADO' ? 'default' : 'secondary'}>
                          {contrato.status === 'FINALIZADO' ? 'Finalizado' : 'Rascunho'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <GerarContratoDialog
        open={contratoDialogOpen}
        onOpenChange={setContratoDialogOpen}
      />

      {/* Document Viewer */}
      {selectedDoc && (
        <DocumentoViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          nome={selectedDoc.nome}
          arquivoPath={selectedDoc.arquivo_path}
          getSignedUrl={getSignedUrl}
          onDownload={downloadDocumento}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o documento "{docToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
