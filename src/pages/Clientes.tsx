import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCRMStore } from '@/stores/crmStore';
import { STATUS_FUNIL_LABELS, StatusFunil } from '@/types/crm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NovoClienteDialog } from '@/components/clientes/NovoClienteDialog';
import { cn } from '@/lib/utils';

const statusColors: Record<StatusFunil, string> = {
  QUALIFICACAO: 'bg-primary/10 text-primary border-primary/20',
  VISITA_PROPOSTA: 'bg-warning/10 text-warning border-warning/20',
  DOCUMENTACAO: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  FECHADO_GANHO: 'bg-success/10 text-success border-success/20',
  FECHADO_PERDIDO: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function Clientes() {
  const { clientes } = useCRMStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredClientes = clientes.filter((cliente) => {
    const matchesSearch = cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
      cliente.telefone.includes(search) ||
      cliente.email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'TODOS' || cliente.status_funil === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-muted-foreground">
            {clientes.length} clientes cadastrados
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os status</SelectItem>
            {Object.entries(STATUS_FUNIL_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Client List */}
      <div className="space-y-3">
        {filteredClientes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {search || statusFilter !== 'TODOS'
                ? 'Nenhum cliente encontrado com os filtros aplicados.'
                : 'Nenhum cliente cadastrado ainda.'}
            </CardContent>
          </Card>
        ) : (
          filteredClientes.map((cliente) => (
            <Card key={cliente.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{cliente.nome}</h3>
                      <Badge 
                        variant="outline" 
                        className={cn(statusColors[cliente.status_funil])}
                      >
                        {STATUS_FUNIL_LABELS[cliente.status_funil]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{cliente.telefone}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Último contato: {format(new Date(cliente.ultimo_contato), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link to={`/clientes/${cliente.id}`}>
                      Ver Detalhes
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <NovoClienteDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
