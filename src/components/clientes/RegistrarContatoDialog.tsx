import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCRMStore } from '@/stores/crmStore';
import { TipoContato, TIPO_CONTATO_LABELS } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';

interface RegistrarContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
}

export function RegistrarContatoDialog({ open, onOpenChange, clienteId }: RegistrarContatoDialogProps) {
  const { addHistorico, updateCliente } = useCRMStore();
  const { toast } = useToast();
  const [tipo, setTipo] = useState<TipoContato>('LIGACAO');
  const [descricao, setDescricao] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addHistorico({ cliente_id: clienteId, tipo, descricao, data: new Date().toISOString() });
    updateCliente(clienteId, { ultimo_contato: new Date().toISOString() });
    toast({ title: 'Contato registrado!' });
    setDescricao('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar Contato</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Tipo de Contato</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoContato)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_CONTATO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Descrição *</Label><Textarea required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o contato..." /></div>
          <Button type="submit" className="w-full">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
