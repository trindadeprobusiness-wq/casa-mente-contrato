import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, CalendarDays, DollarSign, Wallet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function BillsList() {
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

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'PAGO': return 'success'; // You might need to map to classic variants or use custom classes
            case 'PENDENTE': return 'warning';
            case 'ATRASADO': return 'destructive';
            case 'CANCELADO': return 'secondary';
            default: return 'outline';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'PAGO': 'Pago',
            'PENDENTE': 'Pendente',
            'ATRASADO': 'Atrasado',
            'CANCELADO': 'Cancelado'
        };
        return labels[status] || status;
    };

    // Custom badge styles since variant might not support 'success' directly in shadcn default
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
            <Card className="border shadow-sm bg-card/50 h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Carregando faturas...</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="border shadow-sm bg-card/50">
            <CardHeader className="pb-4">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        Gestão de Faturas
                    </CardTitle>
                    <CardDescription>
                        Controle de cobranças e recebimentos de aluguel
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {!bills?.length ? (
                    <div className="text-center py-12 text-muted-foreground bg-muted/20 border-t">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                        <h3 className="text-lg font-medium text-foreground">Nenhuma fatura encontrada</h3>
                        <p className="text-sm">As faturas geradas aparecerão aqui.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Referência</TableHead>
                                <TableHead>Imóvel / Inquilino</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Asaas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bills.map((bill: any) => (
                                <TableRow key={bill.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{bill.mes_referencia}</span>
                                            <span className="text-xs text-muted-foreground font-normal">ID: ...{bill.id.slice(-4)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{bill.contratos?.imoveis?.titulo}</span>
                                            <span className="text-xs text-muted-foreground">{bill.contratos?.clientes?.nome}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-3 w-3 text-muted-foreground" />
                                            {format(new Date(bill.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 font-semibold text-green-700 dark:text-green-400">
                                            <span className="text-xs">R$</span>
                                            {bill.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={getBadgeStyle(bill.status)}>
                                            {getStatusLabel(bill.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {bill.external_id ? (
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200 gap-1">
                                                <DollarSign className="h-3 w-3" /> Integrado
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
