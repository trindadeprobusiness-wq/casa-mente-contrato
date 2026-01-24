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
import { Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { RepasseProprietario } from "@/types/rental";

export function RepassesList() {
    const queryClient = useQueryClient();
    const [selectedTransfer, setSelectedTransfer] = useState<RepasseProprietario | null>(null);
    const [proofUrl, setProofUrl] = useState<string>("");
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

    // Fetch Transfers
    const { data: transfers, isLoading } = useQuery({
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "CONFIRMADO": return <Badge className="bg-green-500">Confirmado</Badge>;
            case "AGENDADO": return <Badge variant="outline" className="text-blue-600 border-blue-600">Agendado</Badge>;
            case "ENVIADO": return <Badge className="bg-blue-500">Enviado</Badge>;
            case "ERRO": return <Badge variant="destructive">Erro</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Repasses aos Proprietários</CardTitle>
                <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["owner-transfers"] })}>
                    Atualizar
                </Button>
            </CardHeader>
            <CardContent>
                {!transfers?.length ? (
                    <div className="text-center py-8 text-muted-foreground">Nenhum repasse encontrado.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data Prevista</TableHead>
                                <TableHead>Proprietário</TableHead>
                                <TableHead>Imóvel</TableHead>
                                <TableHead>Valor Líquido</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfers.map((t: any) => (
                                <TableRow key={t.id}>
                                    <TableCell>{format(new Date(t.data_prevista), "dd/MM/yyyy")}</TableCell>
                                    <TableCell className="font-medium">{t.proprietario_nome || "N/A"}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">
                                        {t.contratos?.imoveis?.titulo}
                                    </TableCell>
                                    <TableCell>
                                        R$ {t.valor_liquido_repasse.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(t.status)}</TableCell>
                                    <TableCell className="text-right">
                                        {t.status === "AGENDADO" || t.status === "ENVIADO" ? (
                                            <Button size="sm" variant="outline" onClick={() => handleOpenConfirmDialog(t)}>
                                                <Send className="mr-2 h-4 w-4" /> Confirmar
                                            </Button>
                                        ) : (
                                            <Button variant="ghost" size="sm" disabled>
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Concluído
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
                            <div className="text-xl font-bold text-green-600">
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
