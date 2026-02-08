import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, CalendarDays, DollarSign, Wallet, Search, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function BillsList() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const { data: bills, isLoading } = useQuery({
        queryKey: ["rental-bills"],
        queryFn: async () => {
            // Fetch faturas with related contract info
            const { data, error } = await supabase
                .from("faturas_aluguel")
                .select(`
                    *,
                    contratos (
                        id,
                        imoveis ( titulo, endereco ),
                        clientes ( nome )
                    )
                `)
                .order("data_vencimento", { ascending: false });

            if (error) throw error;
            return data;
        },
    });

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
            queryClient.invalidateQueries({ queryKey: ["rental-contracts"] }); // Update charts potentially
        } catch (error: any) {
            console.error("Erro ao baixar fatura:", error);
            toast.error("Erro ao confirmar pagamento: " + error.message);
        }
    };

    const filteredBills = bills?.filter(bill => {
        const matchesSearch =
            bill.contratos?.imoveis?.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.contratos?.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase());

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
                                    placeholder="Buscar fatura..."
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
                                            <TableHead>Referência</TableHead>
                                            <TableHead>Imóvel / Inquilino</TableHead>
                                            <TableHead>Vencimento</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredBills.map((bill: any) => (
                                            <TableRow key={bill.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-background rounded border shadow-sm text-xs font-bold text-muted-foreground">
                                                            {bill.mes_referencia.split('/')[0]}
                                                        </div>
                                                        <div className="flex flex-col text-xs text-muted-foreground">
                                                            <span>{bill.mes_referencia.split('/')[1]}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground">{bill.contratos?.imoveis?.titulo}</span>
                                                        <span className="text-xs text-muted-foreground">{bill.contratos?.clientes?.nome}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {format(new Date(bill.data_vencimento), "dd 'de' MMM", { locale: ptBR })}
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
