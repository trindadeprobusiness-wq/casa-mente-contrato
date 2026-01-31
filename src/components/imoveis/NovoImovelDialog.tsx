import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useCRMStore } from '@/stores/crmStore';
import { TipoImovel } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';
import { useImovelFotos } from '@/hooks/useImovelFotos';
import { ImovelFotosUpload } from './ImovelFotosUpload';
import { supabase } from '@/integrations/supabase/client';

interface NovoImovelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imovelToEdit?: any; // Added prop for editing
}

export function NovoImovelDialog({ open, onOpenChange, imovelToEdit }: NovoImovelDialogProps) {
  const { addImovel, fetchImoveis } = useCRMStore();
  const { toast } = useToast();
  const { uploadMultipleFotos, uploading } = useImovelFotos();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!imovelToEdit;

  // Default values set to empty strings for cleaner UX (users don't have to delete '0')
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'APARTAMENTO' as TipoImovel,
    valor: '',
    area_m2: '',
    dormitorios: '',
    garagem: '',
    endereco: '',
    bairro: '',
    cidade: 'Anápolis', // Changed default city per request
    proprietario_nome: ''
  });

  const resetForm = () => {
    setForm({
      titulo: '',
      tipo: 'APARTAMENTO',
      valor: '',
      area_m2: '',
      dormitorios: '',
      garagem: '',
      endereco: '',
      bairro: '',
      cidade: 'Anápolis',
      proprietario_nome: ''
    });
    setPendingFiles([]);
  };

  useEffect(() => {
    if (imovelToEdit && open) {
      setForm({
        titulo: imovelToEdit.titulo || '',
        tipo: imovelToEdit.tipo || 'APARTAMENTO',
        valor: imovelToEdit.valor?.toString() || '',
        area_m2: imovelToEdit.area_m2?.toString() || '',
        dormitorios: imovelToEdit.dormitorios?.toString() || '',
        garagem: imovelToEdit.garagem?.toString() || '',
        endereco: imovelToEdit.endereco || '',
        bairro: imovelToEdit.bairro || '',
        cidade: imovelToEdit.cidade || 'Anápolis',
        proprietario_nome: imovelToEdit.proprietario_nome || ''
      });
    } else if (!open && !imovelToEdit) {
      resetForm();
    }
  }, [imovelToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let imovel;

      if (!isEditing) {
        // Get corretor_id only for new inserts
        const { data: corretorId, error: corretorError } = await supabase.rpc('get_corretor_id');
        if (corretorError || !corretorId) {
          throw new Error('Não foi possível identificar o corretor');
        }

        // Create imovel in database
        const { data, error } = await supabase
          .from('imoveis')
          .insert({
            titulo: form.titulo,
            tipo: form.tipo,
            valor: Number(form.valor) || 0,
            area_m2: Number(form.area_m2) || 0,
            dormitorios: Number(form.dormitorios) || 0,
            garagem: Number(form.garagem) || 0,
            endereco: form.endereco,
            bairro: form.bairro,
            cidade: form.cidade,
            proprietario_nome: form.proprietario_nome,
            corretor_id: corretorId,
          })
          .select()
          .single();

        if (error) throw error;
        imovel = data;

      } else {
        // Update existing
        const { data, error } = await supabase
          .from('imoveis')
          .update({
            titulo: form.titulo,
            tipo: form.tipo,
            valor: Number(form.valor) || 0,
            area_m2: Number(form.area_m2) || 0,
            dormitorios: Number(form.dormitorios) || 0,
            garagem: Number(form.garagem) || 0,
            endereco: form.endereco,
            bairro: form.bairro,
            cidade: form.cidade,
            proprietario_nome: form.proprietario_nome,
          })
          .eq('id', imovelToEdit.id)
          .select()
          .single();

        if (error) throw error;
        imovel = data;
      }

      // Upload photos if any
      if (pendingFiles.length > 0 && imovel) {
        await uploadMultipleFotos(imovel.id, pendingFiles);
      }

      toast({ title: `Imóvel ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!` });
      if (!isEditing) resetForm(); // Only reset if new, keep values if editing? Or close.
      onOpenChange(false);
      fetchImoveis();
    } catch (error: any) {
      console.error('Erro ao salvar imóvel:', error);
      toast({ title: 'Erro ao salvar imóvel', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open && !imovelToEdit) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? 'Editar Imóvel' : 'Novo Imóvel'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Título *</Label><Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoImovel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="APARTAMENTO">Apartamento</SelectItem>
                  <SelectItem value="CASA">Casa</SelectItem>
                  <SelectItem value="COMERCIAL">Comercial</SelectItem>
                  <SelectItem value="TERRENO">Terreno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Valor (R$) *</Label><Input type="number" required value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Área (m²)</Label><Input type="number" value={form.area_m2} onChange={(e) => setForm({ ...form, area_m2: e.target.value })} /></div>
            <div><Label>Dorms</Label><Input type="number" value={form.dormitorios} onChange={(e) => setForm({ ...form, dormitorios: e.target.value })} /></div>
            <div><Label>Vagas</Label><Input type="number" value={form.garagem} onChange={(e) => setForm({ ...form, garagem: e.target.value })} /></div>
          </div>
          <div><Label>Endereço *</Label><Input required value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Bairro *</Label><Input required value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></div>
            <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
          </div>
          <div><Label>Proprietário *</Label><Input required value={form.proprietario_nome} onChange={(e) => setForm({ ...form, proprietario_nome: e.target.value })} /></div>

          <Separator />

          <div>
            <Label className="mb-3 block">Fotos do Imóvel</Label>
            <ImovelFotosUpload
              onFilesSelected={setPendingFiles}
              uploading={uploading}
            />
            {pendingFiles.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {pendingFiles.length} foto(s) serão enviadas ao salvar
              </p>
            )}
            {isEditing && (
              <p className="text-xs text-muted-foreground mt-2">Novas fotos serão adicionadas à galeria existente.</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting || uploading}>
            {submitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Imóvel')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
