import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Loader2, CalendarDays, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function RepassesList() {
    const { data: payouts, isLoading } = useQuery({
        queryKey: ["rental-payouts"],
        queryFn: async () => {
            // Fetch repasses with contract info
            const { data, error } = await supabase
                .from("repasses_proprietario")
                .select(`
                    *,
                    contratos (
                        imoveis ( titulo )
                    )
                `)
                .order("data_prevista", { ascending: true });

            if (error) throw error;
            return data;
        },
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'CONFIRMADO': return "bg-green-100 text-green-800 border-green-200";
            case 'ENVIADO': return "bg-blue-100 text-blue-800 border-blue-200";
            case 'AGENDADO': return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case 'ERRO': return "bg-red-100 text-red-800 border-red-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    if (isLoading) {
        return (
            <Card className="border shadow-sm bg-card/50 h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Carregando repasses...</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="border shadow-sm bg-card/50">
            <CardHeader className="pb-4">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-primary" />
                        Repasses aos Proprietários
                    </CardTitle>
                    <CardDescription>
                        Gerencie as transferências dos valores líquidos para os proprietários
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {!payouts?.length ? (
                    <div className="text-center py-12 text-muted-foreground bg-muted/20 border-t">
                        <ArrowRightLeft className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                        <h3 className="text-lg font-medium text-foreground">Nenhum repasse agendado</h3>
                        <p className="text-sm">Os repasses gerados aparecerão aqui.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data Prevista</TableHead>
                                <TableHead>Proprietário / Imóvel</TableHead>
                                <TableHead>Valor Bruto</TableHead>
                                <TableHead>Taxa Adm</TableHead>
                                <TableHead>Valor Líquido</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payouts.map((payout: any) => (
                                <TableRow key={payout.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2 font-medium">
                                            <CalendarDays className="h-3 w-3 text-muted-foreground" />
                                            {format(new Date(payout.data_prevista), "dd/MM/yyyy", { locale: ptBR })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{payout.proprietario_nome}</span>
                                            <span className="text-xs text-muted-foreground">{payout.contratos?.imoveis?.titulo}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        R$ {payout.valor_bruto_recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-red-500 text-xs">
                                        - R$ {payout.valor_taxa_adm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-green-600">
                                            R$ {payout.valor_liquido_repasse.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={getStatusStyle(payout.status)}>
                                            {payout.status}
                                        </Badge>
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
