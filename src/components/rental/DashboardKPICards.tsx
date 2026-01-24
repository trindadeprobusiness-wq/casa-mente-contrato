import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Building, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";

export function DashboardKPICards() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ["rental-kpis"],
        queryFn: async () => {
            // 1. Total a Receber (Faturas PENDENTE do mês atual/futuro)
            const { data: bills } = await supabase
                .from("faturas_aluguel")
                .select("valor_total")
                .eq("status", "PENDENTE");

            const totalReceivable = bills?.reduce((acc, curr) => acc + curr.valor_total, 0) || 0;

            // 2. Total Repassado (Repasses CONFIRMADO)
            const { data: transfers } = await supabase
                .from("repasses_proprietario")
                .select("valor_liquido_repasse")
                .eq("status", "CONFIRMADO");

            const totalTransferred = transfers?.reduce((acc, curr) => acc + curr.valor_liquido_repasse, 0) || 0;

            // 3. Contratos Ativos
            const { count: activeContracts } = await supabase
                .from("contratos")
                .select("*", { count: 'exact', head: true })
                .eq("status", "ATIVO");

            // 4. Receita Estimada (Comissões PENDENTES + PAGAS esse mês) - Simplificado
            // Vamos pegar 10% do Receivable como estimativa rápida se não tivermos histórico
            const estimatedCommission = totalReceivable * 0.10;

            return {
                totalReceivable,
                totalTransferred,
                activeContracts: activeContracts || 0,
                estimatedCommission
            };
        }
    });

    if (isLoading) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-xl"></div>)}
    </div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        R$ {stats?.totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Faturas pendentes</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Repasses Realizados</CardTitle>
                    <ArrowDownRight className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        R$ {stats?.totalTransferred.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Valor já pago aos donos</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.activeContracts}</div>
                    <p className="text-xs text-muted-foreground">Imóveis alugados</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Comissão (Est.)</CardTitle>
                    <Wallet className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        R$ {stats?.estimatedCommission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Sua receita prevista</p>
                </CardContent>
            </Card>
        </div>
    );
}
