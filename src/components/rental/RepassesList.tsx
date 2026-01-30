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
import { Loader2, Send, CheckCircle2, AlertCircle, Search, RefreshCw, CalendarDays, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { RepasseProprietario } from "@/types/rental";

export function RepassesList() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTransfer, setSelectedTransfer] = useState<RepasseProprietario | null>(null);
    const [proofUrl, setProofUrl] = useState<string>("");
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

    // Fetch Transfers
    const { data: transfers, isLoading, isRefetching, error } = useQuery({
        queryKey: ["owner-transfers"],
        queryFn: async () => {
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
        retry: 1,
    });

    // Confirm Transfer Mutation
    const confirmTransferMutation = useMutation({
        mutationFn: async (vars: { id: string; url: string }) => {
            const { error } = await supabase
                .from("repasses_proprietario")
                .update({
                    status: "CONFIRMADO",
                    data_transferencia: new Date().toISOString(),
                    comprovante_transferencia_url: vars.url,
                })
                .eq("id", vars.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["owner-transfers"] });
            toast.success("Repasse confirmado com sucesso!");
            setIsConfirmDialogOpen(false);
            setSelectedTransfer(null);
        },
        onError: (error) => {
            toast.error("Erro ao confirmar repasse: " + error.message);
        },
    });

    const handleOpenConfirmDialog = (transfer: any) => {
        setSelectedTransfer(transfer);
        setIsConfirmDialogOpen(true);
    };

    const handleConfirm = () => {
        if (!selectedTransfer) return;
        confirmTransferMutation.mutate({ id: selectedTransfer.id, url: proofUrl });
    };

    const filteredTransfers = transfers?.filter(t => {
        const searchLower = searchTerm.toLowerCase();
        return (
            t.proprietario_nome?.toLowerCase().includes(searchLower) ||
            t.contratos?.imoveis?.titulo?.toLowerCase().includes(searchLower)
        );
    });

    // Stats
    const totalPending = filteredTransfers?.filter(t => t.status === 'AGENDADO' || t.status === 'ENVIADO')
        .reduce((acc, curr) => acc + curr.valor_liquido_repasse, 0) || 0;

    const totalConfirmed = filteredTransfers?.filter(t => t.status === 'CONFIRMADO')
        .reduce((acc, curr) => acc + curr.valor_liquido_repasse, 0) || 0;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "CONFIRMADO": return <Badge className="bg-green-500 border-green-600">Confirmado</Badge>;
            case "AGENDADO": return <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50">Agendado</Badge>;
            case "ENVIADO": return <Badge className="bg-blue-500">Enviado</Badge>;
            case "ERRO": return <Badge variant="destructive">Erro</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando repasses...</div>;

    if (error) return (
        <div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
            <h3 className="text-lg font-medium text-destructive">Erro ao carregar repasses</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Verifique se o banco de dados foi atualizado.
            </p>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["owner-transfers"] })}>
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
                            <ArrowRightLeft className="h-5 w-5 text-primary" />
                            Repasses aos Proprietários
                        </CardTitle>
                        <CardDescription>
                            Gerencie as transferências dos valores líquidos para os proprietários
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar proprietário ou imóvel..."
                                className="pl-9 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ["owner-transfers"] })}
                            className="h-9 w-9"
                            title="Atualizar lista"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {!filteredTransfers?.length ? (
                    <div className="text-center py-12 text-muted-foreground bg-muted/20 border-t">
                        <ArrowRightLeft className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                        <h3 className="text-lg font-medium text-foreground">Nenhum repasse encontrado</h3>
                        <p className="text-sm">Os repasses são gerados automaticamente quando uma fatura é paga.</p>
                    </div>
                ) : (
                    <div className="rounded-md border-t overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Data Prevista</TableHead>
                                    <TableHead>Proprietário</TableHead>
                                    <TableHead>Imóvel</TableHead>
                                    <TableHead>Valor Líquido</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransfers.map((t: any) => (
                                    <TableRow key={t.id} className="group hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium text-xs">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                                {format(new Date(t.data_prevista), "dd/MM/yyyy")}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">{t.proprietario_nome || "N/A"}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                            {t.contratos?.imoveis?.titulo}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-sm text-green-700 dark:text-green-400">
                                                R$ {t.valor_liquido_repasse.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(t.status)}</TableCell>
                                        <TableCell className="text-right">
                                            {t.status === "AGENDADO" || t.status === "ENVIADO" ? (
                                                <Button size="sm" variant="outline" className="h-7 text-xs border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400" onClick={() => handleOpenConfirmDialog(t)}>
                                                    <Send className="mr-2 h-3 w-3" /> Confirmar
                                                </Button>
                                            ) : (
                                                <div className="text-xs text-muted-foreground flex items-center justify-end">
                                                    <CheckCircle2 className="mr-1 h-3 w-3 text-green-500" /> Transferido
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="bg-muted/30 p-4 border-t flex justify-end items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">A Pagar:</span>
                                <span className="font-semibold text-blue-600">R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Pago Total:</span>
                                <span className="font-semibold text-green-600">R$ {totalConfirmed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>

            <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Transferência</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Proprietário</Label>
                            <div className="font-medium">{selectedTransfer?.proprietario_nome}</div>
                        </div>
                        <div className="space-y-2">
                            <Label>Valor do Repasse</Label>
                            <div className="text-3xl font-bold text-green-600">
                                R$ {selectedTransfer?.valor_liquido_repasse.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Link do Comprovante (Opcional)</Label>
                            <Input
                                value={proofUrl}
                                onChange={(e) => setProofUrl(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleConfirm} disabled={confirmTransferMutation.isPending}>
                            {confirmTransferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Envio
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

