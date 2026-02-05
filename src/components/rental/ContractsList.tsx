import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, User as UserIcon, Building2, FileText, CalendarDays, ArrowUpRight, ArrowDownLeft, MoreHorizontal, Search, DollarSign, Wallet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NewContractDialog } from "./NewContractDialog";
import { parseContratoContent } from "@/types/rental";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ContractsList() {
    const [isCalcOpen, setIsCalcOpen] = useState(false);
    const [isNewContractOpen, setIsNewContractOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<any>(null);
    const [simulatedRent, setSimulatedRent] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const { data: contracts, isLoading } = useQuery({
        queryKey: ["rental-contracts"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("contratos")
                .select(`
                    *,
                    clientes ( nome, telefone ),
                    imoveis ( titulo, endereco, proprietario_nome )
                `)
                .eq("tipo", "LOCACAO_RESIDENCIAL")
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
                .createSignedUrl(path, 60 * 60);

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (error: any) {
            console.error('Erro ao abrir contrato:', error);
            alert('Erro ao abrir contrato: ' + error.message);
        }
    };

    const filteredContracts = contracts?.filter(contract => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            contract.imoveis?.titulo?.toLowerCase().includes(searchLower) ||
            contract.imoveis?.proprietario_nome?.toLowerCase().includes(searchLower) ||
            contract.clientes?.nome?.toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter === "ALL" ? true : contract.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Stats
    const totalActive = contracts?.filter(c => c.status === 'ATIVO').length || 0;
    const totalRentValue = contracts?.filter(c => c.status === 'ATIVO').reduce((acc, curr) => acc + (curr.valor || 0), 0) || 0;

    if (isLoading) {
        return (
            <div className="p-8 text-center flex flex-col items-center gap-3 text-muted-foreground animate-pulse">
                <FileText className="h-8 w-8 animate-pulse opacity-50" />
                <p>Carregando contratos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-sm border-l-4 border-l-primary">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Contratos Ativos</p>
                            <h3 className="text-2xl font-bold text-primary">{totalActive}</h3>
                        </div>
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                            <FileText className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-l-4 border-l-green-500">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Valor Total (Mensal)</p>
                            <h3 className="text-2xl font-bold text-green-600">R$ {totalRentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="p-2 bg-green-100 rounded-full text-green-600">
                            <Wallet className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border shadow-sm bg-card/50">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Carteira de Contratos
                            </CardTitle>
                            <CardDescription>
                                Gestão inteligente de locações e recebíveis
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por imóvel, proprietário..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button onClick={() => setIsNewContractOpen(true)} size="sm" className="hidden md:flex">
                                <UserIcon className="mr-2 h-4 w-4" /> Novo Contrato
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs defaultValue="ALL" onValueChange={setStatusFilter} className="w-full">
                        <div className="px-4 pb-4">
                            <TabsList className="grid w-full grid-cols-4 md:w-[400px]">
                                <TabsTrigger value="ALL">Todos</TabsTrigger>
                                <TabsTrigger value="ATIVO">Ativos</TabsTrigger>
                                <TabsTrigger value="PENDENTE">Pendentes</TabsTrigger>
                                <TabsTrigger value="CANCELADO">Cancelados</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="border-t">
                            {!filteredContracts?.length ? (
                                <div className="text-center py-16 text-muted-foreground bg-muted/20">
                                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                                    <h3 className="text-lg font-medium text-foreground">Nenhum contrato encontrado</h3>
                                    <p className="text-sm">Cadastre um novo contrato para começar.</p>
                                    <Button onClick={() => setIsNewContractOpen(true)} variant="outline" className="mt-4 md:hidden">
                                        Novo Contrato
                                    </Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-[300px]">Imóvel</TableHead>
                                            <TableHead>Envolvidos</TableHead>
                                            <TableHead className="text-right">Financeiro</TableHead>
                                            <TableHead className="text-center">Repasse</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredContracts.map((contract: any) => {
                                            const content = parseContratoContent(contract.conteudo);
                                            const contractFeePct = content.taxa_administracao || contract.taxa_administracao_percentual || 10;
                                            const currentFee = contract.valor * (contractFeePct / 100);
                                            const currentNet = contract.valor - currentFee;

                                            // Manual Asaas Check - only true if explicitly flagged
                                            const isAsaasIntegrated = content.asaas_integrated === true;

                                            return (
                                                <TableRow key={contract.id} className="group hover:bg-muted/30 transition-colors">
                                                    <TableCell>
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-900/50">
                                                                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-sm text-foreground">
                                                                    {contract.imoveis?.titulo}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                                    {contract.imoveis?.endereco || "Endereço não informado"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1.5 text-xs">
                                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                <ArrowUpRight className="h-3 w-3 text-red-400" />
                                                                <span className="font-medium text-foreground">Prop:</span> {contract.imoveis?.proprietario_nome}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                <ArrowDownLeft className="h-3 w-3 text-green-500" />
                                                                <span className="font-medium text-foreground">Inq:</span> {contract.clientes?.nome}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <div className="font-semibold text-sm">
                                                                R$ {contract.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                                            </div>
                                                            <div className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                                Taxa: {contractFeePct}%
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                                            <div className="font-medium text-green-600 dark:text-green-400 text-sm">
                                                                R$ {currentNet.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Dia {content.dia_repasse || contract.dia_vencimento + 5}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col gap-1 items-center">
                                                            <Badge
                                                                variant="outline"
                                                                className={`
                                                                    ${contract.status === 'ATIVO' ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20' : ''}
                                                                    ${contract.status === 'PENDENTE' ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/20' : ''}
                                                                    ${contract.status === 'CANCELADO' ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20' : ''}
                                                                `}
                                                            >
                                                                {contract.status}
                                                            </Badge>
                                                            {isAsaasIntegrated && (
                                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] h-5 gap-1 px-2">
                                                                    <DollarSign className="h-3 w-3" /> Asaas
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => handleOpenCalculator(contract)}>
                                                                    <Calculator className="mr-2 h-4 w-4" /> Simular Repasse
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => {
                                                                    setSelectedContract(contract);
                                                                    setIsNewContractOpen(true);
                                                                }}>
                                                                    <MoreHorizontal className="mr-2 h-4 w-4" /> Editar Contrato
                                                                </DropdownMenuItem>

                                                                <DropdownMenuItem onClick={async () => {
                                                                    try {
                                                                        const newStatus = !isAsaasIntegrated;
                                                                        const newContent = {
                                                                            ...content,
                                                                            asaas_integrated: newStatus
                                                                        };

                                                                        const { error } = await supabase
                                                                            .from('contratos')
                                                                            .update({ conteudo: JSON.stringify(newContent) })
                                                                            .eq('id', contract.id);

                                                                        if (error) throw error;

                                                                        window.location.reload();
                                                                    } catch (err) {
                                                                        console.error('Erro ao alternar Asaas:', err);
                                                                        alert('Erro ao atualizar status Asaas');
                                                                    }
                                                                }}>
                                                                    <div className="flex items-center w-full">
                                                                        <DollarSign className="mr-2 h-4 w-4 text-secondary-foreground" />
                                                                        {isAsaasIntegrated ? 'Remover Asaas' : 'Integrar Asaas'}
                                                                    </div>
                                                                </DropdownMenuItem>

                                                                {contract.arquivo_url && (
                                                                    <DropdownMenuItem onClick={() => handleViewContract(contract.arquivo_url)}>
                                                                        <FileText className="mr-2 h-4 w-4" /> Ver Contrato
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem className="text-red-600">
                                                                    Encerrar Contrato
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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

            {/* Calculator Dialog */}
            <Dialog open={isCalcOpen} onOpenChange={setIsCalcOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-primary" />
                            Simulador de Repasse
                        </DialogTitle>
                    </DialogHeader>
                    {selectedContract && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Valor do Aluguel (R$)</Label>
                                <Input
                                    type="number"
                                    value={simulatedRent}
                                    onChange={(e) => setSimulatedRent(Number(e.target.value))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {(() => {
                                    const content = parseContratoContent(selectedContract.conteudo);
                                    const feePct = content.taxa_administracao || selectedContract.taxa_administracao_percentual || 10;
                                    const fee = simulatedRent * (feePct / 100);
                                    const net = simulatedRent - fee;
                                    return (
                                        <>
                                            <div className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 space-y-1">
                                                <div className="text-xs text-muted-foreground font-medium">Taxa ({feePct}%)</div>
                                                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                    R$ {fee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-lg border bg-green-50/50 dark:bg-green-900/10 space-y-1">
                                                <div className="text-xs text-muted-foreground font-medium">Líquido Proprietário</div>
                                                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                                    R$ {net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <NewContractDialog
                open={isNewContractOpen}
                onOpenChange={(open) => {
                    setIsNewContractOpen(open);
                    if (!open) setSelectedContract(null);
                }}
                contractToEdit={selectedContract}
            />
        </div>
    );
}
