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
import { Calculator, User as UserIcon, Building2, FileText, CalendarDays, ArrowUpRight, ArrowDownLeft, MoreHorizontal, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NewContractDialog } from "./NewContractDialog";
import { parseContratoContent } from "@/types/rental";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ContractsList() {
    const [isCalcOpen, setIsCalcOpen] = useState(false);
    const [isNewContractOpen, setIsNewContractOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<any>(null);
    const [simulatedRent, setSimulatedRent] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState("");

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

    const calculateBreakdown = () => {
        if (!selectedContract) return { fee: 0, net: 0, feePct: 0 };
        const content = parseContratoContent(selectedContract.conteudo);
        const feePct = content.taxa_administracao || selectedContract.taxa_administracao_percentual || 10;
        const fee = simulatedRent * (feePct / 100);
        const net = simulatedRent - fee;
        return { fee, net, feePct };
    };

    const filteredContracts = contracts?.filter(contract => {
        const searchLower = searchTerm.toLowerCase();
        return (
            contract.imoveis?.titulo?.toLowerCase().includes(searchLower) ||
            contract.imoveis?.proprietario_nome?.toLowerCase().includes(searchLower) ||
            contract.clientes?.nome?.toLowerCase().includes(searchLower)
        );
    });

    // Calculate Totals
    const totalRent = filteredContracts?.reduce((acc, curr) => acc + (curr.valor || 0), 0) || 0;
    const totalActive = filteredContracts?.filter(c => c.status === 'ATIVO').length || 0;

    const { fee, net, feePct } = calculateBreakdown();

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando carteira de contratos...</div>;

    return (
        <>
            <Card className="border shadow-sm bg-card/50">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Carteira de Contratos
                            </CardTitle>
                            <CardDescription>
                                Gestão centralizada dos contratos de locação residencial
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por imóvel, proprietário..."
                                    className="pl-9 h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button onClick={() => setIsNewContractOpen(true)} size="sm" className="h-9 shadow-sm">
                                <UserIcon className="mr-2 h-4 w-4" /> Novo Contrato
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {!filteredContracts?.length ? (
                        <div className="text-center py-12 text-muted-foreground bg-muted/20 border-t">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                            <h3 className="text-lg font-medium text-foreground">Nenhum contrato encontrado</h3>
                            <p className="text-sm">Cadastre um novo contrato para começar a gerenciar.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border-t overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[300px]">Imóvel</TableHead>
                                        <TableHead>Envolvidos</TableHead>
                                        <TableHead className="text-right">Financeiro</TableHead>
                                        <TableHead className="text-center">Repasse</TableHead>
                                        <TableHead className="text-center">Vigência</TableHead>
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
                                        const startDate = new Date(contract.data_inicio);

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
                                                            Taxa: {contractFeePct}% (- R$ {currentFee.toLocaleString("pt-BR", { minimumFractionDigits: 0 })})
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                                        <div className="font-medium text-green-600 dark:text-green-400 text-sm">
                                                            R$ {currentNet.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground flex items-center">
                                                            Dia {content.dia_repasse || contract.dia_vencimento + 5}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <CalendarDays className="h-3 w-3" />
                                                            {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
                                                        </div>
                                                        <div className="opacity-75" title={`Fim: ${content.data_fim_calculada ? format(new Date(content.data_fim_calculada), "dd/MM/yyyy", { locale: ptBR }) : 'Não informado'}`}>
                                                            Vence dia {contract.dia_vencimento}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
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
                            <div className="bg-muted/30 p-4 border-t flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">
                                    Total de <strong>{totalActive}</strong> contratos ativos
                                </span>
                                <div className="flex gap-6">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Volume de Aluguéis:</span>
                                        <span className="font-semibold text-foreground">R$ {totalRent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>

                <Dialog open={isCalcOpen} onOpenChange={setIsCalcOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Simulador Financeiro</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-4">
                                <div className="p-2 bg-background rounded-full border shadow-sm">
                                    <Building2 className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{selectedContract?.imoveis?.titulo}</h4>
                                    <p className="text-xs text-muted-foreground">{selectedContract?.imoveis?.endereco}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Valor Base do Aluguel</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                                        <Input
                                            type="number"
                                            className="pl-9"
                                            value={simulatedRent}
                                            onChange={(e) => setSimulatedRent(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 space-y-1">
                                        <div className="text-xs text-muted-foreground font-medium">Taxa ({feePct}%)</div>
                                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                            R$ {fee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg border bg-green-50/50 dark:bg-green-900/10 space-y-1">
                                        <div className="text-xs text-muted-foreground font-medium">Líquido Prophetário</div>
                                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                            R$ {net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
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
