import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCRMStore } from '@/stores/crmStore';
import { TipoImovel } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';

interface NovoImovelDialogProps { open: boolean; onOpenChange: (open: boolean) => void; }

export function NovoImovelDialog({ open, onOpenChange }: NovoImovelDialogProps) {
  const { addImovel } = useCRMStore();
  const { toast } = useToast();
  const [form, setForm] = useState({ titulo: '', tipo: 'APARTAMENTO' as TipoImovel, valor: 0, area_m2: 0, dormitorios: 1, garagem: 0, endereco: '', bairro: '', cidade: 'São Paulo', proprietario_nome: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addImovel(form);
    toast({ title: 'Imóvel cadastrado!' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo Imóvel</DialogTitle></DialogHeader>
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
            <div><Label>Valor (R$) *</Label><Input type="number" required value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Área (m²)</Label><Input type="number" value={form.area_m2} onChange={(e) => setForm({ ...form, area_m2: Number(e.target.value) })} /></div>
            <div><Label>Dorms</Label><Input type="number" value={form.dormitorios} onChange={(e) => setForm({ ...form, dormitorios: Number(e.target.value) })} /></div>
            <div><Label>Vagas</Label><Input type="number" value={form.garagem} onChange={(e) => setForm({ ...form, garagem: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Endereço *</Label><Input required value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Bairro *</Label><Input required value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></div>
            <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
          </div>
          <div><Label>Proprietário *</Label><Input required value={form.proprietario_nome} onChange={(e) => setForm({ ...form, proprietario_nome: e.target.value })} /></div>
          <Button type="submit" className="w-full">Cadastrar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
