import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, CalendarDays, Wallet, Search, AlertCircle, CheckCircle, ArrowUpRight, ArrowDownLeft, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function BillsList() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [referenceDate, setReferenceDate] = useState(new Date());

    const referenceMonthStr = format(referenceDate, 'MM/yyyy');
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();

    // 1. Load active contracts (The source of truth)
    const { data: activeContracts, isLoading: loadingContracts } = useQuery({
        queryKey: ["active-contracts-for-bills"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('contratos')
                .select(`
                    *,
                    imoveis ( titulo, endereco, proprietario_nome ),
                    clientes ( nome )
                `)
                .eq('status', 'ATIVO');
            if (error) throw error;
            return data;
        },
    });

    // 2. Load generated bills for the current reference month
    const { data: monthlyBills, isLoading: loadingBills } = useQuery({
        queryKey: ["rental-bills-monthly", referenceMonthStr],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("faturas_aluguel")
                .select('*')
                .eq('mes_referencia', referenceMonthStr);
            if (error) throw error;
            return data;
        },
    });

    const isLoading = loadingContracts || loadingBills;

    // 3. Compute Smart Bills List
    const smartBills = useMemo(() => {
        if (!activeContracts) return [];
        const now = new Date();

        return activeContracts.map(contract => {
            const existingBill = monthlyBills?.find(b => b.contrato_id === contract.id);

            const dueDay = contract.dia_vencimento || 10;
            const dueDate = new Date(refYear, refMonth, dueDay);
            const isLate = dueDate < now;

            // If bill exists in DB, use its data. Otherwise, project a virtual bill.
            const status = existingBill ? existingBill.status : (isLate ? 'ATRASADO' : 'PENDENTE');
            const valor = existingBill ? existingBill.valor_total : contract.valor;
            const boletoUrl = existingBill?.boleto_url || null;
            const id = existingBill ? existingBill.id : `virtual_${contract.id}`;

            return {
                id,
                isVirtual: !existingBill,
                contract,
                dueDate,
                status,
                valor_total: valor,
                boletoUrl
            };
        }).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }, [activeContracts, monthlyBills, refMonth, refYear]);

    // 4. Filtering
    const filteredBills = smartBills.filter(bill => {
        const matchesSearch =
            bill.contract.imoveis?.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.contract.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.contract.imoveis?.proprietario_nome?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "ALL" ? true : bill.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // 5. Stats
    const totalPending = smartBills.filter(b => b.status === "PENDENTE" || b.status === "ATRASADO").reduce((acc, curr) => acc + curr.valor_total, 0);
    const totalPaid = smartBills.filter(b => b.status === "PAGO").reduce((acc, curr) => acc + curr.valor_total, 0);

    // Helpers
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

    // Actions
    const handleConfirmPayment = async (bill: any) => {
        if (!confirm("Confirmar o recebimento desta fatura?")) return;

        const loadingToast = toast.loading("Processando pagamento...");
        try {
            if (bill.isVirtual) {
                // Fatura não existe no banco (virtual), vamos CRIAR e já marcar como PAGA.
                const { error } = await supabase
                    .from('faturas_aluguel')
                    .insert({
                        contrato_id: bill.contract.id,
                        cliente_id: bill.contract.cliente_id,
                        imovel_id: bill.contract.imovel_id,
                        corretor_id: bill.contract.corretor_id,
                        valor_aluguel: bill.contract.valor, // Base value
                        status: 'PAGO',                     // Paid right away
                        data_vencimento: bill.dueDate.toISOString(),
                        mes_referencia: referenceMonthStr,
                        data_pagamento: new Date().toISOString(),
                        valor_pago: bill.contract.valor
                    });
                if (error) throw error;
            } else {
                // Fatura já existe no banco, apenas atualiza o status
                const { error } = await supabase
                    .from("faturas_aluguel")
                    .update({
                        status: 'PAGO',
                        data_pagamento: new Date().toISOString(),
                        valor_pago: bill.valor_total
                    })
                    .eq('id', bill.id);
                if (error) throw error;
            }

            toast.dismiss(loadingToast);
            toast.success("Pagamento confirmado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["rental-bills-monthly", referenceMonthStr] });
        } catch (error: any) {
            console.error("Erro ao baixar fatura:", error);
            toast.dismiss(loadingToast);
            toast.error("Erro ao confirmar pagamento: " + error.message);
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
                <CardHeader className="pb-4 border-b">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-primary" />
                                Gestão de Faturas
                            </CardTitle>
                            <CardDescription>
                                Controle financeiro sincronizado automaticamente com seus contratos ativos.
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Month Selector */}
                            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    onClick={() => setReferenceDate(subMonths(referenceDate, 1))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="w-32 text-center font-medium text-sm capitalize">
                                    {format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR })}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    onClick={() => setReferenceDate(addMonths(referenceDate, 1))}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por fatura, imóvel..."
                                    className="pl-9 h-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs defaultValue="ALL" onValueChange={setStatusFilter} className="w-full">
                        <div className="px-4 py-3 bg-muted/20 border-b">
                            <TabsList className="grid w-full grid-cols-4 md:w-[400px]">
                                <TabsTrigger value="ALL">Todas</TabsTrigger>
                                <TabsTrigger value="PENDENTE">Pendentes</TabsTrigger>
                                <TabsTrigger value="PAGO">Pagas</TabsTrigger>
                                <TabsTrigger value="ATRASADO">Atrasadas</TabsTrigger>
                            </TabsList>
                        </div>

                        <div>
                            {!filteredBills?.length ? (
                                <div className="text-center py-16 text-muted-foreground bg-muted/10">
                                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                                    <h3 className="text-lg font-medium text-foreground">Nenhuma fatura encontrada</h3>
                                    <p className="text-sm">Tente ajustar os filtros de busca no mês atual.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-[300px]">Imóvel</TableHead>
                                            <TableHead>Envolvidos</TableHead>
                                            <TableHead>Vencimento</TableHead>
                                            <TableHead>Valor Estimado</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredBills.map((bill) => (
                                            <TableRow key={bill.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell>
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-900/50">
                                                            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-sm text-foreground">
                                                                {bill.contract.imoveis?.titulo}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                                {bill.contract.imoveis?.endereco || "Endereço não informado"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1.5 text-xs">
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <ArrowUpRight className="h-3 w-3 text-red-400" />
                                                            <span className="font-medium text-foreground">Prop:</span> {bill.contract.imoveis?.proprietario_nome}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <ArrowDownLeft className="h-3 w-3 text-green-500" />
                                                            <span className="font-medium text-foreground">Inq:</span> {bill.contract.clientes?.nome}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {format(bill.dueDate, "dd/MM/yyyy", { locale: ptBR })}
                                                        {bill.isVirtual && (
                                                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground ml-1" title="Fatura estimativa, ainda não efetivada no banco">
                                                                A Gerar
                                                            </span>
                                                        )}
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
                                                                onClick={() => handleConfirmPayment(bill)}
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

                                                        {bill.boletoUrl && (
                                                            <a href={bill.boletoUrl} target="_blank" rel="noopener noreferrer">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50">
                                                                    <FileText className="h-4 w-4" />
                                                                </Button>
                                                            </a>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
