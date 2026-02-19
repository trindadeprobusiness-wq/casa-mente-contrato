import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, CalendarDays, DollarSign, Wallet, Search, TrendingUp, AlertCircle, CheckCircle, ArrowUpRight, ArrowDownLeft, Building2, RotateCw } from "lucide-react";
import { format, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function BillsList() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const hasSynced = useRef(false);

    const { data: bills, isLoading } = useQuery({
        queryKey: ["rental-bills"],
        queryFn: async () => {
            // Fetch faturas with related contract info including Owner
            const { data, error } = await supabase
                .from("faturas_aluguel")
                .select(`
                    *,
                    contratos (
                        id,
                        imoveis ( titulo, endereco, proprietario_nome ),
                        clientes ( nome )
                    )
                `)
                .order("data_vencimento", { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    const { data: activeContracts } = useQuery({
        queryKey: ["active-contracts-for-sync"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('contratos')
                .select('*')
                .eq('status', 'ATIVO');
            if (error) throw error;
            return data;
        },
    });

    // Auto-sync: runs once when both bills and contracts are loaded
    useEffect(() => {
        if (hasSynced.current) return;
        if (!bills || !activeContracts || activeContracts.length === 0) return;

        hasSynced.current = true;

        const runAutoSync = async () => {
            try {
                const now = new Date();
                const currentMonthStr = format(now, 'MM/yyyy');

                // Determine reference month from most recent bill, or current month
                let referenceMonthStr = currentMonthStr;
                if (bills.length > 0 && (bills[0] as any).mes_referencia) {
                    referenceMonthStr = (bills[0] as any).mes_referencia;
                }

                const [refMonthNum, refYearNum] = referenceMonthStr.split('/').map(Number);
                const refYear = refYearNum;
                const refMonth = refMonthNum - 1;

                const allPromises: Promise<any>[] = [];
                let createdCount = 0;
                let updatedCount = 0;

                for (const contract of activeContracts) {
                    const dueDay = contract.dia_vencimento;
                    const dueDate = new Date(refYear, refMonth, dueDay);
                    const correctStatus = dueDate < now ? 'ATRASADO' : 'PENDENTE';

                    const existingBill = bills.find(
                        (b: any) => b.contrato_id === contract.id && b.mes_referencia === referenceMonthStr
                    );

                    if (!existingBill) {
                        // Create missing bill
                        const p = supabase
                            .from('faturas_aluguel')
                            .insert({
                                contrato_id: contract.id,
                                valor_total: contract.valor,
                                data_vencimento: dueDate.toISOString(),
                                status: correctStatus,
                                mes_referencia: referenceMonthStr,
                                data_geracao: now.toISOString()
                            })
                            .then(({ error }) => { if (!error) createdCount++; });
                        allPromises.push(p as unknown as Promise<any>);
                    } else if ((existingBill as any).status !== 'PAGO') {
                        // Force update to match contract
                        const p = supabase
                            .from('faturas_aluguel')
                            .update({
                                valor_total: contract.valor,
                                data_vencimento: dueDate.toISOString(),
                                status: correctStatus
                            })
                            .eq('id', (existingBill as any).id)
                            .then(({ error }) => { if (!error) updatedCount++; });
                        allPromises.push(p as unknown as Promise<any>);
                    }
                }

                await Promise.all(allPromises);

                if (createdCount > 0 || updatedCount > 0) {
                    queryClient.invalidateQueries({ queryKey: ["rental-bills"] });
                }
            } catch (err) {
                console.error("Auto-sync error:", err);
            }
        };

        runAutoSync();
    }, [bills, activeContracts, queryClient]);

    const handleConfirmPayment = async (billId: string, value: number) => {
        if (!confirm("Confirmar o recebimento desta fatura?")) return;

        try {
            const { error } = await supabase
                .from("faturas_aluguel")
                .update({
                    status: 'PAGO',
                    data_pagamento: new Date().toISOString(),
                    valor_pago: value
                })
                .eq('id', billId);

            if (error) throw error;

            toast.success("Pagamento confirmado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["rental-bills"] });
            queryClient.invalidateQueries({ queryKey: ["rental-contracts"] });
        } catch (error: any) {
            console.error("Erro ao baixar fatura:", error);
            toast.error("Erro ao confirmar pagamento: " + error.message);
        }
    };

    const filteredBills = bills?.filter(bill => {
        const matchesSearch =
            bill.contratos?.imoveis?.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.contratos?.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.contratos?.imoveis?.proprietario_nome?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "ALL" ? true : bill.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Stats
    const totalPending = bills?.filter(b => b.status === "PENDENTE").reduce((acc, curr) => acc + curr.valor_total, 0) || 0;
    const totalPaid = bills?.filter(b => b.status === "PAGO").reduce((acc, curr) => acc + curr.valor_total, 0) || 0;

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'PAGO': 'Pago',
            'PENDENTE': 'Pendente',
            'ATRASADO': 'Atrasado',
            'CANCELADO': 'Cancelado'
        };
        return labels[status] || status;
    };

    const getBadgeStyle = (status: string) => {
        switch (status) {
            case 'PAGO': return "bg-green-100 text-green-800 border-green-200 hover:bg-green-100";
            case 'PENDENTE': return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
            case 'ATRASADO': return "bg-red-100 text-red-800 border-red-200 hover:bg-red-100";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 text-center flex flex-col items-center gap-3 text-muted-foreground animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Carregando faturas inteligentes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm border-l-4 border-l-yellow-500">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">A Receber</p>
                            <h3 className="text-2xl font-bold text-yellow-600">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-green-500">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Recebido</p>
                            <h3 className="text-2xl font-bold text-green-600">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="p-2 bg-green-100 rounded-full text-green-600">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border shadow-sm bg-card/50">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-primary" />
                                Gestão de Faturas
                            </CardTitle>
                            <CardDescription>
                                Controle financeiro e baixa manual de recebimentos
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por fatura, imóvel..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs defaultValue="ALL" onValueChange={setStatusFilter} className="w-full">
                        <div className="px-4 pb-4">
                            <TabsList className="grid w-full grid-cols-4 md:w-[400px]">
                                <TabsTrigger value="ALL">Todas</TabsTrigger>
                                <TabsTrigger value="PENDENTE">Pendentes</TabsTrigger>
                                <TabsTrigger value="PAGO">Pagas</TabsTrigger>
                                <TabsTrigger value="ATRASADO">Atrasadas</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="border-t">
                            {!filteredBills?.length ? (
                                <div className="text-center py-16 text-muted-foreground bg-muted/20">
                                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                                    <h3 className="text-lg font-medium text-foreground">Nenhuma fatura encontrada</h3>
                                    <p className="text-sm">Tente ajustar os filtros de busca.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-[300px]">Imóvel</TableHead>
                                            <TableHead>Envolvidos</TableHead>
                                            <TableHead>Vencimento</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredBills.map((bill: any) => {
                                            // Handle timezone offset by assuming DB stores UTC midnight for dates,
                                            // adding 12h ensures we fall into the same day regardless of typical offsets.
                                            const dueDate = addHours(new Date(bill.data_vencimento), 12);

                                            return (
                                                <TableRow key={bill.id} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell>
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-900/50">
                                                                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-sm text-foreground">
                                                                    {bill.contratos?.imoveis?.titulo}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                                    {bill.contratos?.imoveis?.endereco || "Endereço não informado"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1.5 text-xs">
                                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                <ArrowUpRight className="h-3 w-3 text-red-400" />
                                                                <span className="font-medium text-foreground">Prop:</span> {bill.contratos?.imoveis?.proprietario_nome}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                <ArrowDownLeft className="h-3 w-3 text-green-500" />
                                                                <span className="font-medium text-foreground">Inq:</span> {bill.contratos?.clientes?.nome}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {format(dueDate, "dd/MM/yyyy", { locale: ptBR })}
                                                            <span className="text-xs text-muted-foreground">
                                                                ({format(dueDate, "MMMM", { locale: ptBR })})
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-semibold text-foreground">
                                                            R$ {bill.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={getBadgeStyle(bill.status)}>
                                                            {getStatusLabel(bill.status)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {bill.status === 'PENDENTE' || bill.status === 'ATRASADO' ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="default"
                                                                    className="h-8 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                                                    onClick={() => handleConfirmPayment(bill.id, bill.valor_total)}
                                                                    title="Confirmar Pagamento (Baixar Fatura)"
                                                                >
                                                                    <CheckCircle className="h-4 w-4 mr-1.5" />
                                                                    Baixar Fatura
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground flex items-center justify-end h-8 px-3">
                                                                    {bill.status === 'PAGO' ? (
                                                                        <span className="flex items-center text-green-600">
                                                                            <CheckCircle className="h-3 w-3 mr-1" /> Pago
                                                                        </span>
                                                                    ) : '-'}
                                                                </span>
                                                            )}

                                                            {bill.boleto_url && (
                                                                <a href={bill.boleto_url} target="_blank" rel="noopener noreferrer">
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50">
                                                                        <FileText className="h-4 w-4" />
                                                                    </Button>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                        const toastId = toast.loading("Sincronizando faturas com contratos...");
                        try {
                            const now = new Date();

                            // 1. Fetch ALL active contracts
                            const { data: contracts, error: contractsError } = await supabase
                                .from('contratos')
                                .select('*')
                                .eq('status', 'ATIVO');

                            if (contractsError || !contracts || contracts.length === 0) {
                                toast.dismiss(toastId);
                                toast.info("Nenhum contrato ativo encontrado.");
                                return;
                            }

                            // 2. Fetch ALL existing bills to find the reference month
                            const { data: allBills } = await supabase
                                .from('faturas_aluguel')
                                .select('contrato_id, mes_referencia, status, id, valor_total, data_vencimento')
                                .order('data_vencimento', { ascending: false });

                            if (!allBills) throw new Error("Falha ao buscar faturas");

                            // 3. Determine reference month: use the most recent bill month, or current month
                            const currentMonthStr = format(now, 'MM/yyyy');
                            let referenceMonthStr = currentMonthStr;

                            if (allBills.length > 0 && allBills[0].mes_referencia) {
                                referenceMonthStr = allBills[0].mes_referencia;
                            }

                            // Parse reference month
                            const [refMonthNum, refYearNum] = referenceMonthStr.split('/').map(Number);
                            const refYear = refYearNum;
                            const refMonth = refMonthNum - 1; // 0-indexed

                            toast.dismiss(toastId);
                            const toastId2 = toast.loading(`Sincronizando para ${referenceMonthStr}...`);

                            let createdCount = 0;
                            let updatedCount = 0;
                            const allPromises: Promise<any>[] = [];

                            contracts.forEach((contract) => {
                                const dueDay = contract.dia_vencimento;
                                const dueDate = new Date(refYear, refMonth, dueDay);
                                const correctStatus = dueDate < now ? 'ATRASADO' : 'PENDENTE';

                                // Find if this contract has a bill for the reference month
                                const existingBill = allBills.find(
                                    b => b.contrato_id === contract.id && b.mes_referencia === referenceMonthStr
                                );

                                if (!existingBill) {
                                    // CREATE MISSING BILL
                                    const promise = supabase
                                        .from('faturas_aluguel')
                                        .insert({
                                            contrato_id: contract.id,
                                            valor_total: contract.valor,
                                            data_vencimento: dueDate.toISOString(),
                                            status: correctStatus,
                                            mes_referencia: referenceMonthStr,
                                            data_geracao: now.toISOString()
                                        })
                                        .then(({ error }) => {
                                            if (!error) createdCount++;
                                            else console.error("Erro ao criar fatura:", error);
                                        });
                                    allPromises.push(promise as unknown as Promise<any>);
                                } else if (existingBill.status !== 'PAGO') {
                                    // FORCE UPDATE: always sync value and date from contract
                                    const promise = supabase
                                        .from('faturas_aluguel')
                                        .update({
                                            valor_total: contract.valor,
                                            data_vencimento: dueDate.toISOString(),
                                            status: correctStatus
                                        })
                                        .eq('id', existingBill.id)
                                        .then(({ error }) => {
                                            if (!error) updatedCount++;
                                            else console.error("Erro ao atualizar fatura:", error);
                                        });
                                    allPromises.push(promise as unknown as Promise<any>);
                                }
                            });

                            await Promise.all(allPromises);

                            toast.dismiss(toastId2);
                            if (createdCount > 0 || updatedCount > 0) {
                                toast.success(`Sincronização concluída para ${referenceMonthStr}!`, {
                                    description: `Criadas: ${createdCount} | Atualizadas: ${updatedCount}`
                                });
                            } else {
                                toast.info(`Todas as faturas de ${referenceMonthStr} já estão corretas.`);
                            }

                            queryClient.invalidateQueries({ queryKey: ["rental-bills"] });

                        } catch (error) {
                            console.error(error);
                            toast.error("Erro ao sincronizar faturas.");
                        }
                    }}
                    className="gap-2"
                >
                    <RotateCw className="h-4 w-4" />
                    Sincronizar Faturas
                </Button>
            </div>
        </div>
    );
}
