import { useState } from 'react';
import { Plus, Search, Bed, Car, Ruler } from 'lucide-react';
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
import { TipoImovel } from '@/types/crm';
import { NovoImovelDialog } from '@/components/imoveis/NovoImovelDialog';

const tipoLabels: Record<TipoImovel, string> = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  COMERCIAL: 'Comercial',
  TERRENO: 'Terreno',
};

export default function Imoveis() {
  const { imoveis } = useCRMStore();
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('TODOS');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredImoveis = imoveis.filter((imovel) => {
    const matchesSearch =
      imovel.titulo.toLowerCase().includes(search.toLowerCase()) ||
      imovel.bairro.toLowerCase().includes(search.toLowerCase()) ||
      imovel.endereco.toLowerCase().includes(search.toLowerCase());

    const matchesTipo = tipoFilter === 'TODOS' || imovel.tipo === tipoFilter;

    return matchesSearch && matchesTipo;
  });

  const formatPrice = (valor: number) => {
    if (valor > 10000) {
      return `R$ ${valor.toLocaleString('pt-BR')}`;
    }
    return `R$ ${valor.toLocaleString('pt-BR')}/mês`;
  };

  const isExclusividadeProxima = (date?: string) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= 7 && days > 0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Imóveis</h1>
          <p className="text-muted-foreground">
            {imoveis.length} imóveis cadastrados
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Imóvel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, bairro ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo de imóvel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os tipos</SelectItem>
            {Object.entries(tipoLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Property Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredImoveis.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              {search || tipoFilter !== 'TODOS'
                ? 'Nenhum imóvel encontrado com os filtros aplicados.'
                : 'Nenhum imóvel cadastrado ainda.'}
            </CardContent>
          </Card>
        ) : (
          filteredImoveis.map((imovel) => (
            <Card key={imovel.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <span className="text-4xl opacity-30">🏢</span>
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold line-clamp-1">{imovel.titulo}</h3>
                  <p className="text-primary font-bold text-lg">
                    {formatPrice(imovel.valor)}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Ruler className="w-4 h-4" />
                    {imovel.area_m2}m²
                  </span>
                  <span className="flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    {imovel.dormitorios}
                  </span>
                  <span className="flex items-center gap-1">
                    <Car className="w-4 h-4" />
                    {imovel.garagem}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-1">
                  {imovel.endereco} - {imovel.bairro}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2">
                    {imovel.exclusividade_ate && (
                      <Badge
                        variant={isExclusividadeProxima(imovel.exclusividade_ate) ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        Exclusiva
                        {isExclusividadeProxima(imovel.exclusividade_ate) && ' ⚠️'}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {imovel.clientes_interessados.length} interessados
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <NovoImovelDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
