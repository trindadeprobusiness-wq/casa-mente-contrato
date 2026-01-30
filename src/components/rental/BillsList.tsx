import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, CheckCircle2, AlertCircle, FileText, Search, RefreshCw, Plus, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { FaturaAluguel } from "@/types/rental";
import { BillDialog } from "./BillDialog";

export function BillsList() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBill, setSelectedBill] = useState<FaturaAluguel | null>(null);
    const [amountPaid, setAmountPaid] = useState<string>("");
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);

    // Manual Bill Management
    const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
    const [billToEdit, setBillToEdit] = useState<any>(null);

    // Fetch Bills
    const { data: bills, isLoading, isRefetching, error } = useQuery({
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
        retry: 1, // Don't retry indefinitely if table is missing
    });

    // Generate Bills Mutation
    const generateBillsMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('generate_monthly_rent_bills', { reference_date: new Date().toISOString() });
            if (error) throw error;
            return data;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ["rental-bills"] });
            toast.success(`${count} faturas geradas para este mês!`);
        },
        onError: (error) => {
            toast.error("Erro ao gerar faturas: " + error.message);
        }
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
            queryClient.invalidateQueries({ queryKey: ["owner-transfers"] }); // Invalidate repasses too
            toast.success("Fatura baixada! Repasse agendado.");
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

    const filteredBills = bills?.filter(bill => {
        const searchLower = searchTerm.toLowerCase();
        return (
            bill.clientes?.nome?.toLowerCase().includes(searchLower) ||
            bill.imoveis?.titulo?.toLowerCase().includes(searchLower)
        );
    });

    // Stats
    const totalPending = filteredBills?.filter(b => b.status === 'PENDENTE' || b.status === 'ATRASADO')
        .reduce((acc, curr) => acc + curr.valor_total, 0) || 0;

    const totalReceived = filteredBills?.filter(b => b.status === 'PAGO')
        .reduce((acc, curr) => acc + (curr.valor_pago || curr.valor_total), 0) || 0;

    const getStatusBadge = (status: string, asaasStatus?: string) => {
        if (asaasStatus === 'RECEIVED') return <Badge className="bg-green-600">Pago (Asaas)</Badge>;
        switch (status) {
            case "PAGO": return <Badge className="bg-green-500 border-green-600">Pago</Badge>;
            case "PENDENTE": return <Badge variant="outline" className="text-amber-600 border-amber-500 bg-amber-50">Pendente</Badge>;
            case "ATRASADO": return <Badge variant="destructive">Atrasado</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando faturas...</div>;

    if (error) return (
        <div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
            <h3 className="text-lg font-medium text-destructive">Erro ao carregar faturas</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Não foi possível acessar os dados. Isso pode ocorrer se as tabelas ainda não foram criadas no banco.
            </p>
            <div className="text-xs bg-muted p-2 rounded overflow-auto max-h-[100px] text-left mb-4 font-mono">
                {error.message}
            </div>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["rental-bills"] })}>
                Tentar Novamente
            </Button>
        </div>
    );

    return (
        <Card className="border shadow-sm bg-card/50">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Gestão de Faturas
                        </CardTitle>
                        <CardDescription>
                            Controle de cobranças e recebimentos de aluguel
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar inquilino ou imóvel..."
                                className="pl-9 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateBillsMutation.mutate()}
                            disabled={generateBillsMutation.isPending}
                            className="h-9"
                        >
                            {generateBillsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Gerar do Mês
                        </Button>
                        <Button onClick={() => { setBillToEdit(null); setIsBillDialogOpen(true); }} size="sm" className="h-9 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> Nova Manual
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {!filteredBills?.length ? (
                    <div className="text-center py-12 text-muted-foreground bg-muted/20 border-t">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                        <h3 className="text-lg font-medium text-foreground">Nenhuma fatura encontrada</h3>
                        <p className="text-sm text-muted-foreground mb-4">Gere as faturas automáticas ou crie uma nova.</p>
                        <Button variant="outline" onClick={() => generateBillsMutation.mutate()} disabled={generateBillsMutation.isPending}>
                            Gerar Faturas Agora
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-md border-t overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Vencimento</TableHead>
                                    <TableHead>Referência</TableHead>
                                    <TableHead>Inquilino</TableHead>
                                    <TableHead>Imóvel</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBills.map((bill: any) => (
                                    <TableRow key={bill.id} className="group hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium text-xs">
                                            <div className="flex items-center gap-2">
                                                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                                                {format(new Date(bill.data_vencimento), "dd/MM/yyyy")}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {bill.mes_referencia}
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">{bill.clientes?.nome || "N/A"}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={bill.imoveis?.titulo}>
                                            {bill.imoveis?.titulo}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-sm">
                                                R$ {bill.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(bill.status, bill.asaas_status)}</TableCell>
                                        <TableCell className="text-right flex justify-end gap-2 text-xs">
                                            {bill.recibo_url && (
                                                <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                                                    <a href={bill.recibo_url} target="_blank" rel="noopener noreferrer">
                                                        <FileText className="mr-1 h-3 w-3" /> Ver Recibo
                                                    </a>
                                                </Button>
                                            )}
                                            {(bill.status === "PENDENTE" || bill.status === "ATRASADO") && !bill.external_id && (
                                                <Button size="sm" variant="secondary" className="h-7 px-2 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30" onClick={() => handleOpenPayDialog(bill)}>
                                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Baixar
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="bg-muted/30 p-4 border-t flex justify-end items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Pendente:</span>
                                <span className="font-semibold text-amber-600">R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Recebido:</span>
                                <span className="font-semibold text-green-600">R$ {totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>

            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Baixar Fatura Manualmente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-sm">
                            Confirmando recebimento de <strong>{selectedBill?.clientes?.nome}</strong> referente a <strong>{selectedBill?.mes_referencia}</strong>.
                        </div>
                        <div className="space-y-2">
                            <Label>Valor do Pagamento (R$)</Label>
                            <Input
                                type="number"
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(e.target.value)}
                            />
                        </div>
                        <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                                Ao confirmar, o sistema irá calcular a taxa administrativa e agendar o repasse ao proprietário automaticamente.
                            </span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleConfirmPayment} disabled={payBillMutation.isPending}>
                            {payBillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Baixa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BillDialog
                open={isBillDialogOpen}
                onOpenChange={setIsBillDialogOpen}
                billToEdit={billToEdit}
            />
        </Card>
    );
}

