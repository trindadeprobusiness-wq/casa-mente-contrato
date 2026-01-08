import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, MapPin, Ruler, Bed, Car, Calendar, User, Phone, Mail, Upload, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCRMStore } from '@/stores/crmStore';
import { ImovelGaleria } from '@/components/imoveis/ImovelGaleria';
import { ImovelFotosUpload } from '@/components/imoveis/ImovelFotosUpload';
import { useImovelFotos, ImovelFoto } from '@/hooks/useImovelFotos';
import { TipoImovel } from '@/types/crm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

const tipoLabels: Record<TipoImovel, string> = {
  APARTAMENTO: 'Apartamento',
  CASA: 'Casa',
  COMERCIAL: 'Comercial',
  TERRENO: 'Terreno',
};

interface ImovelData {
  id: string;
  titulo: string;
  tipo: TipoImovel;
  valor: number;
  area_m2: number | null;
  dormitorios: number | null;
  garagem: number | null;
  endereco: string;
  bairro: string | null;
  cidade: string;
  estado: string | null;
  cep: string | null;
  descricao: string | null;
  exclusividade_ate: string | null;
  proprietario_nome: string;
  proprietario_cpf: string | null;
  proprietario_telefone: string | null;
  proprietario_email: string | null;
  created_at: string | null;
  ativo: boolean | null;
}

interface ClienteInteressado {
  id: string;
  nome: string;
  telefone: string;
  status_funil: string;
}

export default function ImovelDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clientes } = useCRMStore();
  
  const [imovel, setImovel] = useState<ImovelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientesInteressados, setClientesInteressados] = useState<ClienteInteressado[]>([]);
  
  const { fotos, loading: loadingFotos, uploading, fetchFotos, uploadMultipleFotos, deleteFoto, setFotoPrincipal } = useImovelFotos(id);

  useEffect(() => {
    if (id) {
      fetchImovel();
      fetchClientesInteressados();
    }
  }, [id]);

  const fetchImovel = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('imoveis')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar imóvel:', error);
      toast({ title: 'Imóvel não encontrado', variant: 'destructive' });
      navigate('/imoveis');
      return;
    }

    setImovel(data as ImovelData);
    setLoading(false);
  };

  const fetchClientesInteressados = async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from('cliente_imovel')
      .select('cliente_id')
      .eq('imovel_id', id);

    if (data && data.length > 0) {
      const clienteIds = data.map(ci => ci.cliente_id);
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, telefone, status_funil')
        .in('id', clienteIds);
      
      if (clientesData) {
        setClientesInteressados(clientesData);
      }
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    const { error } = await supabase
      .from('imoveis')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir imóvel', variant: 'destructive' });
      return;
    }

    toast({ title: 'Imóvel excluído com sucesso' });
    navigate('/imoveis');
  };

  const handleUploadFotos = async (files: File[]) => {
    if (!id) return;
    await uploadMultipleFotos(id, files);
    setShowUpload(false);
  };

  const handleDeleteFoto = async (fotoId: string, path: string) => {
    await deleteFoto(fotoId, path);
  };

  const handleSetPrincipal = async (fotoId: string) => {
    if (!id) return;
    await setFotoPrincipal(fotoId, id);
  };

  const formatPrice = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const isExclusividadeProxima = (date?: string | null) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= 7 && days > 0;
  };

  const isExclusividadeVencida = (date?: string | null) => {
    if (!date) return false;
    return new Date(date).getTime() < new Date().getTime();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!imovel) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/imoveis')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{imovel.titulo}</h1>
              <Badge variant="secondary">{tipoLabels[imovel.tipo]}</Badge>
              {imovel.exclusividade_ate && (
                <Badge variant={isExclusividadeVencida(imovel.exclusividade_ate) ? 'destructive' : isExclusividadeProxima(imovel.exclusividade_ate) ? 'destructive' : 'outline'}>
                  {isExclusividadeVencida(imovel.exclusividade_ate) ? 'Exclusividade Vencida' : 'Exclusiva'}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{formatPrice(imovel.valor)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Galeria */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Galeria de Fotos ({fotos.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Cancelar' : 'Adicionar Fotos'}
          </Button>
        </CardHeader>
        <CardContent>
          {showUpload && (
            <div className="mb-6">
              <ImovelFotosUpload
                onFilesSelected={handleUploadFotos}
                uploading={uploading}
                maxFiles={10}
              />
            </div>
          )}
          
          {loadingFotos ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : (
            <ImovelGaleria
              fotos={fotos}
              onDelete={handleDeleteFoto}
              onSetPrincipal={handleSetPrincipal}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Informações do Imóvel */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Imóvel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Ruler className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">{imovel.area_m2 || 0}m²</p>
                <p className="text-xs text-muted-foreground">Área</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Bed className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">{imovel.dormitorios || 0}</p>
                <p className="text-xs text-muted-foreground">Dormitórios</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Car className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">{imovel.garagem || 0}</p>
                <p className="text-xs text-muted-foreground">Vagas</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="font-medium">{imovel.endereco}</p>
                  <p className="text-sm text-muted-foreground">
                    {imovel.bairro && `${imovel.bairro}, `}{imovel.cidade}{imovel.estado && `/${imovel.estado}`}
                    {imovel.cep && ` - CEP ${imovel.cep}`}
                  </p>
                </div>
              </div>
            </div>

            {imovel.descricao && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Descrição</p>
                  <p className="text-sm text-muted-foreground">{imovel.descricao}</p>
                </div>
              </>
            )}

            {imovel.exclusividade_ate && (
              <>
                <Separator />
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm">
                    Exclusividade até{' '}
                    <span className="font-medium">
                      {format(new Date(imovel.exclusividade_ate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dados do Proprietário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Proprietário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold text-lg">{imovel.proprietario_nome}</p>
              {imovel.proprietario_cpf && (
                <p className="text-sm text-muted-foreground">CPF: {imovel.proprietario_cpf}</p>
              )}
            </div>

            {imovel.proprietario_telefone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${imovel.proprietario_telefone}`} className="hover:underline">
                  {imovel.proprietario_telefone}
                </a>
              </div>
            )}

            {imovel.proprietario_email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${imovel.proprietario_email}`} className="hover:underline">
                  {imovel.proprietario_email}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clientes Interessados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clientes Interessados ({clientesInteressados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientesInteressados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente vinculado a este imóvel.</p>
            ) : (
              <div className="space-y-3">
                {clientesInteressados.map(cliente => (
                  <div 
                    key={cliente.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                  >
                    <div>
                      <p className="font-medium">{cliente.nome}</p>
                      <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {cliente.status_funil.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gerencie documentos na seção{' '}
              <span 
                className="text-primary cursor-pointer hover:underline"
                onClick={() => navigate('/juridico')}
              >
                Jurídico
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imóvel?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O imóvel "{imovel.titulo}" será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
