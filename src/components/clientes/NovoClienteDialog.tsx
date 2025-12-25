import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCRMStore } from '@/stores/crmStore';
import { TipoInteresse, StatusFunil } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';

interface NovoClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovoClienteDialog({ open, onOpenChange }: NovoClienteDialogProps) {
  const { addCliente } = useCRMStore();
  const { toast } = useToast();
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', tipo_interesse: 'COMPRA' as TipoInteresse, observacoes: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCliente({ ...form, status_funil: 'QUALIFICACAO' as StatusFunil, ultimo_contato: new Date().toISOString() });
    toast({ title: 'Cliente cadastrado com sucesso!' });
    setForm({ nome: '', telefone: '', email: '', tipo_interesse: 'COMPRA', observacoes: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Nome *</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>Telefone *</Label><Input required value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Interesse</Label>
            <Select value={form.tipo_interesse} onValueChange={(v) => setForm({ ...form, tipo_interesse: v as TipoInteresse })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPRA">Compra</SelectItem>
                <SelectItem value="LOCACAO">Locação</SelectItem>
                <SelectItem value="AMBOS">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <Button type="submit" className="w-full">Cadastrar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
