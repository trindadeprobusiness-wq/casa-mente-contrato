import { useState } from 'react';
import { FileText, Upload, CheckCircle, Clock, AlertTriangle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCRMStore } from '@/stores/crmStore';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GerarContratoDialog } from '@/components/juridico/GerarContratoDialog';
import { cn } from '@/lib/utils';

export default function Juridico() {
  const { documentos, contratos, clientes } = useCRMStore();
  const [contratoDialogOpen, setContratoDialogOpen] = useState(false);

  const getDocumentoStatus = (doc: typeof documentos[0]) => {
    if (!doc.data_validade) {
      return doc.validado ? 'validado' : 'pendente';
    }
    const days = differenceInDays(new Date(doc.data_validade), new Date());
    if (days < 0) return 'vencido';
    if (days <= 7) return 'vencendo';
    return 'validado';
  };

  const getClienteNome = (clienteId?: string) => {
    if (!clienteId) return 'Desconhecido';
    const cliente = clientes.find((c) => c.id === clienteId);
    return cliente?.nome || 'Desconhecido';
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
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-medium mb-1">Arraste documentos aqui</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Formatos aceitos: PDF, JPG, PNG (máx. 10MB)
                </p>
                <Button variant="outline">
                  Selecionar Arquivos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documentos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {documentos.length === 0 ? (
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
                              {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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
                          <Button variant="ghost" size="sm">
                            Ver
                          </Button>
                          <Button variant="ghost" size="sm">
                            Download
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
    </div>
  );
}
