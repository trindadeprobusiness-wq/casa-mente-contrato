import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { FaturaAluguel } from "@/types/rental";
import { BillDialog } from "./BillDialog";
import { Plus, Pencil } from "lucide-react";

export function BillsList() {
    const queryClient = useQueryClient();
    const [selectedBill, setSelectedBill] = useState<FaturaAluguel | null>(null);
    const [amountPaid, setAmountPaid] = useState<string>("");
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);

    // Manual Bill Management
    const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
    const [billToEdit, setBillToEdit] = useState<any>(null);

    const handleCreateBill = () => {
        setBillToEdit(null);
        setIsBillDialogOpen(true);
    };

    const handleEditBill = (bill: any) => {
        setBillToEdit(bill);
        setIsBillDialogOpen(true);
    };

    // Fetch Bills
    const { data: bills, isLoading } = useQuery({
        queryKey: ["rental-bills"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("faturas_aluguel")
                .select(`
          *,
          clientes ( nome ),
          imoveis ( titulo, endereco )
        `)
                .order("data_vencimento", { ascending: true });

            if (error) throw error;
            return data;
        },
    });

    // Pay Bill Mutation
    const payBillMutation = useMutation({
        mutationFn: async (vars: { id: string; amount: number }) => {
            const { error } = await supabase
                .from("faturas_aluguel")
                .update({
                    status: "PAGO",
                    valor_pago: vars.amount,
                    data_pagamento: new Date().toISOString(),
                })
                .eq("id", vars.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rental-bills"] });
            toast.success("Fatura baixada com sucesso! Repasse agendado.");
            setIsPayDialogOpen(false);
            setSelectedBill(null);
        },
        onError: (error) => {
            toast.error("Erro ao baixar fatura: " + error.message);
        },
    });

    const handleOpenPayDialog = (bill: any) => {
        setSelectedBill(bill);
        setAmountPaid(bill.valor_total.toString());
        setIsPayDialogOpen(true);
    };

    const handleConfirmPayment = () => {
        if (!selectedBill || !amountPaid) return;
        payBillMutation.mutate({ id: selectedBill.id, amount: parseFloat(amountPaid) });
    };

    const getStatusBadge = (status: string, asaasStatus?: string) => {
        if (asaasStatus === 'RECEIVED') return <Badge className="bg-green-600">Pago (Asaas)</Badge>;
        switch (status) {
            case "PAGO": return <Badge className="bg-green-500">Pago</Badge>;
            case "PENDENTE": return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>;
            case "ATRASADO": return <Badge variant="destructive">Atrasado</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Faturas de Aluguel</CardTitle>
                <div className="flex gap-2">
                    <Button onClick={handleCreateBill}>
                        <Plus className="mr-2 h-4 w-4" /> Nova Fatura
                    </Button>
                    <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["rental-bills"] })}>
                        Atualizar
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {!bills?.length ? (
                    <div className="text-center py-8 text-muted-foreground">Nenhuma fatura encontrada.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>ID Asaas</TableHead>
                                <TableHead>Inquilino</TableHead>
                                <TableHead>Imóvel</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bills.map((bill: any) => (
                                <TableRow key={bill.id}>
                                    <TableCell>{format(new Date(bill.data_vencimento), "dd/MM/yyyy")}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                        {bill.external_id ? bill.external_id : '-'}
                                    </TableCell>
                                    <TableCell className="font-medium">{bill.clientes?.nome || "N/A"}</TableCell>
                                    <TableCell className="max-w-[150px] truncate" title={bill.imoveis?.titulo}>
                                        {bill.imoveis?.titulo}
                                    </TableCell>
                                    <TableCell>
                                        R$ {bill.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(bill.status, bill.asaas_status)}</TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        {bill.recibo_url && (
                                            <Button variant="ghost" size="sm" asChild>
                                                <a href={bill.recibo_url} target="_blank" rel="noopener noreferrer">
                                                    <FileText className="mr-2 h-4 w-4" /> Recibo
                                                </a>
                                            </Button>
                                        )}
                                        {(bill.status === "PENDENTE" || bill.status === "ATRASADO") && !bill.external_id && (
                                            <Button size="sm" onClick={() => handleOpenPayDialog(bill)}>
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Baixar
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Baixar Fatura</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome do Inquilino</Label>
                            <div className="font-medium">{selectedBill?.clientes?.nome}</div>
                        </div>
                        <div className="space-y-2">
                            <Label>Valor do Pagamento (R$)</Label>
                            <Input
                                type="number"
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(e.target.value)}
                            />
                        </div>
                        <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                            <AlertCircle className="inline-block w-4 h-4 mr-2 mb-0.5" />
                            Ao confirmar, o sistema irá <strong>automaticamente</strong> calcular a taxa administrativa e agendar o repasse ao proprietário.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleConfirmPayment} disabled={payBillMutation.isPending}>
                            {payBillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Recebimento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BillDialog
                open={isBillDialogOpen}
                onOpenChange={setIsBillDialogOpen}
                billToEdit={billToEdit}
            />
        </Card >
    );
}
