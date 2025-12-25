import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useCRMStore } from '@/stores/crmStore';
import { TipoContrato, TIPO_CONTRATO_LABELS } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GerarContratoDialogProps { open: boolean; onOpenChange: (open: boolean) => void; clienteId?: string; }

export function GerarContratoDialog({ open, onOpenChange, clienteId }: GerarContratoDialogProps) {
  const { clientes, imoveis, addContrato } = useCRMStore();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [contratoGerado, setContratoGerado] = useState('');
  const [form, setForm] = useState({ tipo: 'LOCACAO_RESIDENCIAL' as TipoContrato, cliente_id: clienteId || '', imovel_id: '', valor: 0, data_inicio: '', prazo_meses: 30, dia_vencimento: 10, indice_reajuste: 'IGPM', permite_animais: false, permite_reformas: false, mobiliado: false });

  const selectedCliente = clientes.find(c => c.id === form.cliente_id);
  const selectedImovel = imoveis.find(i => i.id === form.imovel_id);

  const gerarContrato = async () => {
    setGenerating(true);
    setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(p + 15, 90)), 300);
    
    await new Promise(r => setTimeout(r, 2500));
    clearInterval(interval);
    setProgress(100);

    const contrato = `# CONTRATO DE ${TIPO_CONTRATO_LABELS[form.tipo].toUpperCase()}

## PARTES CONTRATANTES

**LOCADOR:** ${selectedImovel?.proprietario_nome || 'Proprietário'}, CPF: ${selectedImovel?.proprietario_cpf || '000.000.000-00'}

**LOCATÁRIO:** ${selectedCliente?.nome || 'Cliente'}, CPF: Não informado, Telefone: ${selectedCliente?.telefone || ''}

## OBJETO DO CONTRATO

O LOCADOR dá em locação ao LOCATÁRIO o imóvel situado à **${selectedImovel?.endereco}, ${selectedImovel?.bairro} - ${selectedImovel?.cidade}**, com área de ${selectedImovel?.area_m2}m², contendo ${selectedImovel?.dormitorios} dormitório(s) e ${selectedImovel?.garagem} vaga(s) de garagem.

## PRAZO E VALOR

- **Início:** ${form.data_inicio || 'A definir'}
- **Prazo:** ${form.prazo_meses} meses
- **Valor do Aluguel:** R$ ${form.valor.toLocaleString('pt-BR')}/mês
- **Vencimento:** Todo dia ${form.dia_vencimento}
- **Reajuste:** ${form.indice_reajuste}

## CLÁUSULAS ADICIONAIS

${form.permite_animais ? '✅ Permitido animais de estimação' : '❌ Não permitido animais'}
${form.permite_reformas ? '✅ Permitidas reformas com autorização' : '❌ Não permitidas reformas'}
${form.mobiliado ? '✅ Imóvel mobiliado' : '❌ Imóvel não mobiliado'}

---

**Local e Data:** São Paulo, ${new Date().toLocaleDateString('pt-BR')}

_____________________________
**LOCADOR**

_____________________________
**LOCATÁRIO**`;

    setContratoGerado(contrato);
    setGenerating(false);
    setStep(4);
  };

  const salvarContrato = () => {
    addContrato({ tipo: form.tipo, cliente_id: form.cliente_id, imovel_id: form.imovel_id, valor: form.valor, data_inicio: form.data_inicio, prazo_meses: form.prazo_meses, dia_vencimento: form.dia_vencimento, indice_reajuste: form.indice_reajuste, conteudo: contratoGerado, status: 'RASCUNHO' });
    toast({ title: 'Contrato salvo!' });
    onOpenChange(false);
    setStep(1);
    setContratoGerado('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!generating) { onOpenChange(o); setStep(1); setContratoGerado(''); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Gerar Contrato com IA</DialogTitle></DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <Label>Tipo de Contrato</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoContrato })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TIPO_CONTRATO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Button className="w-full" onClick={() => setStep(2)}>Próximo</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div><Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Imóvel</Label>
              <Select value={form.imovel_id} onValueChange={(v) => { const im = imoveis.find(i => i.id === v); setForm({ ...form, imovel_id: v, valor: im?.valor || 0 }); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{imoveis.map(i => <SelectItem key={i.id} value={i.id}>{i.titulo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(1)}>Voltar</Button><Button className="flex-1" onClick={() => setStep(3)} disabled={!form.cliente_id || !form.imovel_id}>Próximo</Button></div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data Início</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
              <div><Label>Prazo (meses)</Label><Input type="number" value={form.prazo_meses} onChange={(e) => setForm({ ...form, prazo_meses: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor (R$)</Label><Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
              <div><Label>Dia Vencimento</Label><Input type="number" value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Índice Reajuste</Label>
              <Select value={form.indice_reajuste} onValueChange={(v) => setForm({ ...form, indice_reajuste: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="IGPM">IGP-M</SelectItem><SelectItem value="IPCA">IPCA</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cláusulas Adicionais</Label>
              <div className="flex items-center gap-2"><Checkbox checked={form.permite_animais} onCheckedChange={(c) => setForm({ ...form, permite_animais: !!c })} /><span className="text-sm">Permite animais</span></div>
              <div className="flex items-center gap-2"><Checkbox checked={form.permite_reformas} onCheckedChange={(c) => setForm({ ...form, permite_reformas: !!c })} /><span className="text-sm">Permite reformas</span></div>
              <div className="flex items-center gap-2"><Checkbox checked={form.mobiliado} onCheckedChange={(c) => setForm({ ...form, mobiliado: !!c })} /><span className="text-sm">Mobiliado</span></div>
            </div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(2)}>Voltar</Button><Button className="flex-1" onClick={gerarContrato}><Sparkles className="w-4 h-4 mr-2" />Gerar Contrato com IA</Button></div>
          </div>
        )}

        {generating && (
          <div className="py-8 text-center space-y-4">
            <Sparkles className="w-12 h-12 mx-auto text-primary animate-pulse" />
            <p className="font-medium">IA trabalhando...</p>
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">{progress < 30 ? 'Carregando dados...' : progress < 60 ? 'Verificando cláusulas...' : 'Montando documento...'}</p>
          </div>
        )}

        {step === 4 && contratoGerado && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>Este contrato foi gerado por IA e deve ser revisado por advogado.</span>
            </div>
            <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">{contratoGerado}</pre>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep(1); setContratoGerado(''); }}>Nova Geração</Button>
              <Button className="flex-1" onClick={salvarContrato}>Salvar Contrato</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
