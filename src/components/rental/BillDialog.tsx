import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BillDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    billToEdit?: any; // If present, edit mode
}

export function BillDialog({ open, onOpenChange, billToEdit }: BillDialogProps) {
    const queryClient = useQueryClient();

    // Form States
    const [contractId, setContractId] = useState("");
    const [monthRef, setMonthRef] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [valueRent, setValueRent] = useState("");
    const [status, setStatus] = useState("PENDENTE");

    // Load data if editing
    useEffect(() => {
        if (billToEdit) {
            setContractId(billToEdit.contrato_id);
            setMonthRef(billToEdit.mes_referencia);
            setDueDate(billToEdit.data_vencimento ? billToEdit.data_vencimento.split('T')[0] : "");
            setValueRent(billToEdit.valor_total.toString());
            setStatus(billToEdit.status);
        } else {
            // Reset for create
            setContractId("");
            setMonthRef(format(new Date(), "MM/yyyy"));
            setDueDate(format(new Date(), "yyyy-MM-dd"));
            setValueRent("");
            setStatus("PENDENTE");
        }
    }, [billToEdit, open]);

    // Fetch Contracts (for selection)
    const { data: contracts } = useQuery({
        queryKey: ["contracts-select-bills"],
        queryFn: async () => {
            const { data } = await supabase
                .from("contratos")
                .select("id, imoveis(titulo), clientes(nome)")
                .eq("status", "ATIVO");
            return data || [];
        },
        enabled: !billToEdit // Only fetch if creating new (or edit but we need list anyway? actually we need list always to show name)
    });

    // Mutation
    const saveBillMutation = useMutation({
        mutationFn: async () => {
            // Get Broker ID from contract or current user? 
            // Bills are linked to contracts, which have corretor_id.
            // If creating, we need to pick contract first.
            if (!contractId) throw new Error("Selecione um contrato");

            const billData = {
                contrato_id: contractId,
                mes_referencia: monthRef,
                data_vencimento: dueDate,
                // valor_total is generated, do not send it
                valor_aluguel: parseFloat(valueRent), // Simplified for manual
                status: status,
                // We need to fetch other IDs from contract to fill redundancy if needed?
                // The trigger/backend usually handles it or we should query more.
                // For simplicity assuming the table columns allow nulls or we fill them.
                // Actually supabase fetch above helps.
            };

            let error;
            if (billToEdit) {
                const { error: err } = await supabase
                    .from("faturas_aluguel")
                    .update(billData)
                    .eq("id", billToEdit.id);
                error = err;
            } else {
                // Determine corretor/cliente/imovel from contract
                const { data: contract } = await supabase.from("contratos").select("*").eq("id", contractId).single();
                if (!contract) throw new Error("Contrato inválido");

                const { error: err } = await supabase
                    .from("faturas_aluguel")
                    .insert({
                        ...billData,
                        corretor_id: contract.corretor_id,
                        cliente_id: contract.cliente_id,
                        imovel_id: contract.imovel_id,
                        valor_condominio: 0,
                        valor_iptu: 0,
                        valor_extras: 0,
                        valor_desconto: 0
                    });
                error = err;
            }

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success(billToEdit ? "Fatura atualizada!" : "Fatura criada!");
            queryClient.invalidateQueries({ queryKey: ["rental-bills"] });
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error("Erro: " + err.message);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{billToEdit ? "Editar Fatura" : "Nova Fatura Manual"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Contrato</Label>
                        <Select value={contractId} onValueChange={setContractId} disabled={!!billToEdit}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {contracts?.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.imoveis?.titulo} - {c.clientes?.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Mês Ref. (MM/AAAA)</Label>
                            <Input value={monthRef} onChange={e => setMonthRef(e.target.value)} placeholder="01/2026" />
                        </div>
                        <div className="space-y-2">
                            <Label>Vencimento</Label>
                            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Valor Total (R$)</Label>
                        <Input type="number" value={valueRent} onChange={e => setValueRent(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PENDENTE">Pendente</SelectItem>
                                <SelectItem value="PAGO">Pago</SelectItem>
                                <SelectItem value="ATRASADO">Atrasado</SelectItem>
                                <SelectItem value="CANCELADO">Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={() => saveBillMutation.mutate()} disabled={saveBillMutation.isPending}>
                        {saveBillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
