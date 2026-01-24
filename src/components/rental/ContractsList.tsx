import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, User as UserIcon, Building2, FileText as FileTextIcon } from "lucide-react";
import { format } from "date-fns";
import { NewContractDialog } from "./NewContractDialog";

export function ContractsList() {
    const [isCalcOpen, setIsCalcOpen] = useState(false);
    const [isNewContractOpen, setIsNewContractOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<any>(null);
    const [simulatedRent, setSimulatedRent] = useState<number>(0);

    const { data: contracts, isLoading } = useQuery({
        queryKey: ["rental-contracts"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("contratos")
                .select(`
                    *,
                    clientes ( nome ),
                    imoveis ( titulo, endereco, proprietario_nome )
                `)
                .eq("tipo", "LOCACAO_RESIDENCIAL") // Filter only rentals
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    const handleOpenCalculator = (contract: any) => {
        setSelectedContract(contract);
        setSimulatedRent(contract.valor);
        setIsCalcOpen(true);
    };

    const handleViewContract = async (path: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('documentos')
                .createSignedUrl(path, 60 * 60); // 1 hour expiry

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (error: any) {
            console.error('Erro ao abrir contrato:', error);
            // toast.error('Erro ao abrir contrato: ' + error.message);
            alert('Erro ao abrir contrato');
        }
    };

    const calculateBreakdown = () => {
        if (!selectedContract) return { fee: 0, net: 0, feePct: 0 };
        const feePct = selectedContract.taxa_administracao_percentual || 10;
        const fee = simulatedRent * (feePct / 100);
        const net = simulatedRent - fee;
        return { fee, net, feePct };
    };

    if (isLoading) return <div>Carregando contratos...</div>;

    const { fee, net, feePct } = calculateBreakdown();

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Contratos Ativos</CardTitle>
                    <Button onClick={() => setIsNewContractOpen(true)}>
                        <UserIcon className="mr-2 h-4 w-4" /> Novo Contrato
                    </Button>
                </CardHeader>
                <CardContent>
                    {!contracts?.length ? (
                        <div className="text-center py-8 text-muted-foreground">Nenhum contrato encontrado.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Imóvel / Proprietário</TableHead>
                                    <TableHead>Inquilino</TableHead>
                                    <TableHead>Valor Aluguel</TableHead>
                                    <TableHead>Repasse (Est.)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contracts.map((contract: any) => {
                                    const currentFee = contract.valor * ((contract.taxa_administracao_percentual || 10) / 100);
                                    const currentNet = contract.valor - currentFee;

                                    return (
                                        <TableRow key={contract.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium truncate max-w-[200px]">{contract.imoveis?.titulo}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <UserIcon className="w-3 h-3" /> {contract.imoveis?.proprietario_nome}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{contract.clientes?.nome}</TableCell>
                                            <TableCell>R$ {contract.valor.toLocaleString("pt-BR")}</TableCell>
                                            <TableCell className="text-green-600 font-medium">
                                                R$ {currentNet.toLocaleString("pt-BR")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-blue-500 text-blue-600">
                                                    {contract.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {contract.arquivo_url && (
                                                        <Button variant="outline" size="sm" onClick={() => handleViewContract(contract.arquivo_url)}>
                                                            <FileTextIcon className="mr-2 h-4 w-4" /> Contrato
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenCalculator(contract)}>
                                                        <Calculator className="mr-2 h-4 w-4" /> Simular
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>

                {/* Smart Calculator Dialog */}
                <Dialog open={isCalcOpen} onOpenChange={setIsCalcOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Calculadora de Repasse Inteligente</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-4">
                                <Building2 className="w-8 h-8 text-primary" />
                                <div>
                                    <h4 className="font-semibold">{selectedContract?.imoveis?.titulo}</h4>
                                    <p className="text-sm text-muted-foreground">Proprietário: {selectedContract?.imoveis?.proprietario_nome}</p>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label>Valor do Aluguel (Simulação)</Label>
                                    <Input
                                        type="number"
                                        value={simulatedRent}
                                        onChange={(e) => setSimulatedRent(Number(e.target.value))}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                        <CardContent className="pt-4">
                                            <div className="text-sm text-muted-foreground">Sua Taxa ({feePct}%)</div>
                                            <div className="text-xl font-bold text-blue-600">
                                                R$ {fee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-4">
                                            <div className="text-sm text-muted-foreground">Repasse Líquido</div>
                                            <div className="text-xl font-bold text-green-600">
                                                R$ {net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </Card>
            <NewContractDialog open={isNewContractOpen} onOpenChange={setIsNewContractOpen} />
        </>
    );
}
