import { useState, useEffect, useMemo } from 'react';
import { Video, Search, Filter, Loader2, Grid3X3, List, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useVideos, VideoRow, TipoVideo } from '@/hooks/useVideos';
import { VideoUploadArea } from '@/components/midias/VideoUploadArea';
import { VideoCard } from '@/components/midias/VideoCard';
import { VideoPlayerDialog } from '@/components/midias/VideoPlayerDialog';
import { EditarVideoDialog } from '@/components/midias/EditarVideoDialog';
import { supabase } from '@/integrations/supabase/client';

interface ImovelSimples {
  id: string;
  titulo: string;
}

type SortOption = 'recentes' | 'antigos' | 'nome' | 'visualizacoes';

const TIPOS_VIDEO: { value: TipoVideo | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos os Tipos' },
  { value: 'TOUR_VIRTUAL', label: 'Tour Virtual' },
  { value: 'APRESENTACAO', label: 'Apresentação' },
  { value: 'DEPOIMENTO', label: 'Depoimento' },
  { value: 'DRONE', label: 'Drone/Aéreo' },
  { value: 'INSTITUCIONAL', label: 'Institucional' },
  { value: 'OUTRO', label: 'Outro' },
];

export default function Midias() {
  const { videos, loading, uploading, uploadProgress, uploadVideo, deleteVideo, updateVideo, incrementVisualizacoes } = useVideos();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<TipoVideo | 'TODOS'>('TODOS');
  const [imovelFilter, setImovelFilter] = useState<string>('TODOS');
  const [sortBy, setSortBy] = useState<SortOption>('recentes');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [imoveis, setImoveis] = useState<ImovelSimples[]>([]);
  const [playerVideo, setPlayerVideo] = useState<VideoRow | null>(null);
  const [editVideo, setEditVideo] = useState<VideoRow | null>(null);
  const [deleteVideoData, setDeleteVideoData] = useState<VideoRow | null>(null);

  useEffect(() => {
    const fetchImoveis = async () => {
      const { data } = await supabase.from('imoveis').select('id, titulo').order('titulo');
      if (data) setImoveis(data);
    };
    fetchImoveis();
  }, []);

  const getImovelNome = (imovelId: string | null) => {
    if (!imovelId) return undefined;
    return imoveis.find(i => i.id === imovelId)?.titulo;
  };

  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(v => 
        v.titulo.toLowerCase().includes(term) ||
        v.descricao?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (tipoFilter !== 'TODOS') {
      result = result.filter(v => v.tipo === tipoFilter);
    }

    // Property filter
    if (imovelFilter !== 'TODOS') {
      if (imovelFilter === 'SEM_IMOVEL') {
        result = result.filter(v => !v.imovel_id);
      } else {
        result = result.filter(v => v.imovel_id === imovelFilter);
      }
    }

    // Sort
    switch (sortBy) {
      case 'recentes':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'antigos':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'nome':
        result.sort((a, b) => a.titulo.localeCompare(b.titulo));
        break;
      case 'visualizacoes':
        result.sort((a, b) => b.visualizacoes - a.visualizacoes);
        break;
    }

    return result;
  }, [videos, searchTerm, tipoFilter, imovelFilter, sortBy]);

  // KPIs
  const kpis = useMemo(() => ({
    total: videos.length,
    tourVirtual: videos.filter(v => v.tipo === 'TOUR_VIRTUAL').length,
    drone: videos.filter(v => v.tipo === 'DRONE').length,
    vinculados: videos.filter(v => v.imovel_id).length,
    visualizacoes: videos.reduce((sum, v) => sum + v.visualizacoes, 0),
  }), [videos]);

  const handlePlay = (video: VideoRow) => {
    setPlayerVideo(video);
  };

  const handleEdit = (video: VideoRow) => {
    setEditVideo(video);
  };

  const handleDeleteClick = (video: VideoRow) => {
    setDeleteVideoData(video);
  };

  const handleConfirmDelete = async () => {
    if (!deleteVideoData) return;
    await deleteVideo(deleteVideoData.id, deleteVideoData.video_path);
    setDeleteVideoData(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          Mídias
        </h1>
        <p className="text-muted-foreground">
          Gerencie vídeos e conteúdos do seu banco de mídias
        </p>
      </div>

      <Tabs defaultValue="videos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="videos">Vídeos</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload de Vídeo</CardTitle>
              <CardDescription>
                Envie vídeos de tours virtuais, apresentações, depoimentos e mais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoUploadArea
                onUpload={uploadVideo}
                uploading={uploading}
                uploadProgress={uploadProgress}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setTipoFilter('TODOS'); setImovelFilter('TODOS'); }}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{kpis.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTipoFilter('TOUR_VIRTUAL')}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{kpis.tourVirtual}</p>
                <p className="text-xs text-muted-foreground">Tours Virtuais</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTipoFilter('DRONE')}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{kpis.drone}</p>
                <p className="text-xs text-muted-foreground">Drone</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setImovelFilter('SEM_IMOVEL')}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{kpis.vinculados}</p>
                <p className="text-xs text-muted-foreground">Vinculados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{kpis.visualizacoes}</p>
                <p className="text-xs text-muted-foreground">Visualizações</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar vídeos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as TipoVideo | 'TODOS')}>
              <SelectTrigger className="w-full md:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_VIDEO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={imovelFilter} onValueChange={setImovelFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Imóvel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Imóveis</SelectItem>
                <SelectItem value="SEM_IMOVEL">Sem Imóvel</SelectItem>
                {imoveis.map((im) => (
                  <SelectItem key={im.id} value={im.id}>{im.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="antigos">Mais antigos</SelectItem>
                <SelectItem value="nome">Alfabética</SelectItem>
                <SelectItem value="visualizacoes">Mais vistos</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Videos Grid */}
          {filteredVideos.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {videos.length === 0 
                    ? 'Nenhum vídeo cadastrado ainda. Faça upload do primeiro vídeo!'
                    : 'Nenhum vídeo encontrado com os filtros aplicados.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "flex flex-col gap-2"
            }>
              {filteredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  imovelNome={getImovelNome(video.imovel_id)}
                  onPlay={handlePlay}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <VideoPlayerDialog
        video={playerVideo}
        open={!!playerVideo}
        onOpenChange={(open) => !open && setPlayerVideo(null)}
        onView={incrementVisualizacoes}
      />

      <EditarVideoDialog
        video={editVideo}
        open={!!editVideo}
        onOpenChange={(open) => !open && setEditVideo(null)}
        onUpdate={updateVideo}
      />

      <AlertDialog open={!!deleteVideoData} onOpenChange={(open) => !open && setDeleteVideoData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Vídeo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteVideoData?.titulo}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
