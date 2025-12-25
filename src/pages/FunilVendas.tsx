import { useState } from 'react';
import { useCRMStore } from '@/stores/crmStore';
import { StatusFunil, STATUS_FUNIL_LABELS } from '@/types/crm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';

const funnelColumns: { status: StatusFunil; label: string; color: string; bgColor: string }[] = [
  { 
    status: 'QUALIFICACAO', 
    label: 'Qualificação', 
    color: 'text-primary',
    bgColor: 'bg-funnel-qualification' 
  },
  { 
    status: 'VISITA_PROPOSTA', 
    label: 'Visita/Proposta', 
    color: 'text-warning',
    bgColor: 'bg-funnel-visit' 
  },
  { 
    status: 'DOCUMENTACAO', 
    label: 'Documentação', 
    color: 'text-orange-500',
    bgColor: 'bg-funnel-documentation' 
  },
  { 
    status: 'FECHADO_GANHO', 
    label: 'Fechamento', 
    color: 'text-success',
    bgColor: 'bg-funnel-closing' 
  },
];

export default function FunilVendas() {
  const { clientes, imoveis, alertas, updateClienteStatus } = useCRMStore();
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);

  const getClientesByStatus = (status: StatusFunil) => {
    return clientes.filter((c) => c.status_funil === status);
  };

  const hasAlert = (clienteId: string) => {
    return alertas.some((a) => a.cliente_id === clienteId && !a.lido);
  };

  const getImovelPrincipal = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente || cliente.imoveis_interesse.length === 0) return null;
    return imoveis.find((i) => i.id === cliente.imoveis_interesse[0]);
  };

  const handleDragStart = (e: React.DragEvent, clienteId: string) => {
    setDraggedClientId(clienteId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: StatusFunil) => {
    e.preventDefault();
    if (draggedClientId) {
      updateClienteStatus(draggedClientId, newStatus);
      setDraggedClientId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedClientId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Funil de Vendas</h1>
        <p className="text-muted-foreground">
          Arraste os cards para mover clientes entre etapas
        </p>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {funnelColumns.map((column) => {
          const columnClientes = getClientesByStatus(column.status);
          
          return (
            <div
              key={column.status}
              className={cn(
                'rounded-lg p-3 min-h-[500px]',
                column.bgColor
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className={cn('font-semibold', column.color)}>
                  {column.label}
                </h3>
                <Badge variant="secondary" className="font-bold">
                  {columnClientes.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {columnClientes.map((cliente) => {
                  const imovel = getImovelPrincipal(cliente.id);
                  const alert = hasAlert(cliente.id);

                  return (
                    <Link
                      key={cliente.id}
                      to={`/clientes/${cliente.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, cliente.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'block bg-card rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing',
                        'hover:shadow-md transition-shadow',
                        draggedClientId === cliente.id && 'opacity-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {alert && (
                              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                            )}
                            <p className="font-medium text-sm truncate">
                              {cliente.nome}
                            </p>
                          </div>
                          {imovel && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {imovel.titulo}
                            </p>
                          )}
                          {imovel && (
                            <p className="text-xs font-medium text-primary mt-0.5">
                              {imovel.valor > 10000
                                ? `R$ ${(imovel.valor / 1000).toFixed(0)}k`
                                : `R$ ${imovel.valor.toLocaleString('pt-BR')}/mês`}
                            </p>
                          )}
                        </div>
                        <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                      </div>
                    </Link>
                  );
                })}

                {columnClientes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum cliente
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Closed Lost Section */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-muted-foreground">
            Fechados Perdidos ({clientes.filter(c => c.status_funil === 'FECHADO_PERDIDO').length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {clientes
              .filter((c) => c.status_funil === 'FECHADO_PERDIDO')
              .map((cliente) => (
                <Badge
                  key={cliente.id}
                  variant="outline"
                  className="text-muted-foreground"
                >
                  {cliente.nome}
                </Badge>
              ))}
            {clientes.filter((c) => c.status_funil === 'FECHADO_PERDIDO').length === 0 && (
              <span className="text-sm text-muted-foreground">
                Nenhum cliente perdido
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
