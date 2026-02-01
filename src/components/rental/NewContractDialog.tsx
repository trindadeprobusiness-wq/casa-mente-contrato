import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calculator, CalendarDays, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { ContractUpload } from "./ContractUpload";
import { parseContratoContent } from "@/types/rental";
import { Database } from "@/integrations/supabase/types";

type TipoContrato = Database["public"]["Enums"]["tipo_contrato"];

interface NewContractDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contractToEdit?: any;
}

export function NewContractDialog({ open, onOpenChange, contractToEdit }: NewContractDialogProps) {
    const queryClient = useQueryClient();
    const isEditing = !!contractToEdit;

    // Form States
    const [clientId, setClientId] = useState("");
    const [propertyId, setPropertyId] = useState("");
    const [rentValue, setRentValue] = useState("");
    const [adminFee, setAdminFee] = useState("10");
    const [startDate, setStartDate] = useState("");
    const [dueDay, setDueDay] = useState("10");
    const [payoutDay, setPayoutDay] = useState("15");
    const [duration, setDuration] = useState("30");
    const [contractFile, setContractFile] = useState<File | null>(null);

    // Populate form when editing
    useEffect(() => {
        if (contractToEdit && open) {
            setClientId(contractToEdit.cliente_id || "");
            setPropertyId(contractToEdit.imovel_id || "");
            setRentValue(contractToEdit.valor?.toString() || "");
            setStartDate(contractToEdit.data_inicio ? contractToEdit.data_inicio.split('T')[0] : "");
            setDueDay(contractToEdit.dia_vencimento?.toString() || "10");

            const content = parseContratoContent(contractToEdit.conteudo);
            setAdminFee(content.taxa_administracao?.toString() || "10");
            setPayoutDay(content.dia_repasse?.toString() || "15");
            setDuration(content.meses_duracao?.toString() || "30");
        } else if (!open && !contractToEdit) {
            setRentValue("");
            setClientId("");
            setPropertyId("");
            setContractFile(null);
            setStartDate("");
        }
    }, [contractToEdit, open]);

    // Fetch Clients
    const { data: clients } = useQuery({
        queryKey: ["clients-select"],
        queryFn: async () => {
            const { data } = await supabase.from("clientes").select("id, nome").order("nome");
            return data || [];
        }
    });

    // Fetch Properties
    const { data: properties } = useQuery({
        queryKey: ["properties-select"],
        queryFn: async () => {
            const { data } = await supabase.from("imoveis").select("id, titulo, proprietario_nome, endereco").eq("ativo", true).order("titulo");
            return data || [];
        }
    });

    const selectedProperty = properties?.find(p => p.id === propertyId);

    // Calculations
    const rent = parseFloat(rentValue) || 0;
    const feePct = parseFloat(adminFee) || 0;
    const feeVal = rent * (feePct / 100);
    const netVal = rent - feeVal;

    // Mutation
    const upsertContractMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data: corretor } = await supabase.from("corretores").select("id").eq("user_id", user.id).single();
            if (!corretor) throw new Error("Perfil de corretor não encontrado");

            let arquivoPath = contractToEdit?.arquivo_url;

            if (contractFile) {
                const fileExt = contractFile.name.split('.').pop();
                const fileName = `${Date.now()}_contrato.${fileExt}`;
                const filePath = `${corretor.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('documentos')
                    .upload(filePath, contractFile);

                if (uploadError) throw new Error("Erro ao fazer upload do contrato: " + uploadError.message);

                arquivoPath = filePath;
            }

            // Estimate end date
            const start = new Date(startDate);
            const end = new Date(start);
            end.setMonth(end.getMonth() + parseInt(duration));

            const tipo: TipoContrato = 'LOCACAO_RESIDENCIAL';

            const contractData = {
                corretor_id: corretor.id,
                cliente_id: clientId,
                imovel_id: propertyId,
                tipo,
                valor: rent,
                data_inicio: startDate || new Date().toISOString(),
                dia_vencimento: parseInt(dueDay),
                conteudo: JSON.stringify({
                    obs: "Contrato Gerado/Atualizado Manualmente",
                    dia_repasse: parseInt(payoutDay),
                    taxa_administracao: feePct,
                    meses_duracao: duration,
                    data_fim_calculada: end.toISOString()
                }),
                status: 'ATIVO',
                arquivo_url: arquivoPath
            };

            let result;

            if (isEditing && contractToEdit) {
                const { data, error } = await supabase
                    .from("contratos")
                    .update(contractData)
                    .eq("id", contractToEdit.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
                toast.success("Contrato atualizado com sucesso!");
            } else {
                const { data, error } = await supabase
                    .from("contratos")
                    .insert(contractData)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
                toast.success("Contrato criado com sucesso!", {
                    description: "Contrato ativo e pronto para gerenciamento."
                });
            }

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rental-contracts"] });
            queryClient.invalidateQueries({ queryKey: ["rental-bills"] });
            onOpenChange(false);

            if (!isEditing) {
                setRentValue("");
                setClientId("");
                setPropertyId("");
                setContractFile(null);
                setStartDate("");
            }
        },
        onError: (err) => {
            toast.error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} contrato: ` + err.message);
        }
    });

    const isValid = clientId && propertyId && rentValue && startDate;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
                    <DialogTitle className="text-xl">{isEditing ? "Editar Contrato" : "Novo Contrato de Aluguel"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Atualize os dados do contrato." : "Preencha os dados do contrato. O sistema calculará automaticamente os repasses."}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-12 max-h-[70vh] overflow-y-auto">
                    {/* Left Column: Entities & Documentation */}
                    <div className="md:col-span-4 p-6 border-r space-y-6 bg-background">
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wider">
                                <UploadCloud className="w-4 h-4" /> Entidades
                            </h3>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label>Imóvel</Label>
                                    <Select value={propertyId} onValueChange={setPropertyId} disabled={isEditing}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o imóvel" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {properties?.map(p => (
                                                <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                                                    <div className="flex flex-col text-left">
                                                        <span className="font-medium">{p.titulo}</span>
                                                        <span className="text-xs text-muted-foreground">{p.proprietario_nome}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedProperty && (
                                        <p className="text-xs text-muted-foreground px-1">
                                            Proprietário: <span className="font-medium text-foreground">{selectedProperty.proprietario_nome}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Inquilino</Label>
                                    <Select value={clientId} onValueChange={setClientId} disabled={isEditing}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o cliente" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients?.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wider">
                                <UploadCloud className="w-4 h-4" /> Documentação
                            </h3>
                            <div className="space-y-2">
                                <Label>Contrato Assinado (PDF)</Label>
                                <ContractUpload onFileSelect={setContractFile} />
                                {isEditing && contractToEdit?.arquivo_url && !contractFile && (
                                    <p className="text-xs text-blue-600">Arquivo atual mantido.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Middle Column: Financials & Dates */}
                    <div className="md:col-span-4 p-6 border-r space-y-6 bg-background">
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wider">
                                <Calculator className="w-4 h-4" /> Financeiro
                            </h3>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label>Valor do Aluguel (R$)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold">R$</span>
                                        <Input
                                            type="number"
                                            value={rentValue}
                                            onChange={e => setRentValue(e.target.value)}
                                            className="pl-10 font-medium"
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label>Taxa Adm (%)</Label>
                                        <Input
                                            type="number"
                                            value={adminFee}
                                            onChange={e => setAdminFee(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Duração (Meses)</Label>
                                        <Select value={duration} onValueChange={setDuration}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="12">12 Meses</SelectItem>
                                                <SelectItem value="24">24 Meses</SelectItem>
                                                <SelectItem value="30">30 Meses</SelectItem>
                                                <SelectItem value="36">36 Meses</SelectItem>
                                                <SelectItem value="48">48 Meses</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wider">
                                <CalendarDays className="w-4 h-4" /> Prazos
                            </h3>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label>Data de Início</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label>Dia Vencimento</Label>
                                        <Select value={dueDay} onValueChange={(val) => {
                                            setDueDay(val);
                                            const next = parseInt(val) + 5;
                                            setPayoutDay(next <= 30 ? next.toString() : "1");
                                        }}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {[5, 10, 15, 20, 25, 30].map(d => (
                                                    <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Dia Repasse</Label>
                                        <Select value={payoutDay} onValueChange={setPayoutDay}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {[1, 5, 10, 15, 20, 25, 28].map(d => (
                                                    <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Summary */}
                    <div className="md:col-span-4 p-6 space-y-4 bg-muted/20">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                            Resumo Financeiro
                        </h3>

                        <Card className="shadow-sm">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Aluguel Bruto:</span>
                                    <span className="font-semibold">R$ {rent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center text-blue-600">
                                    <span>Taxa Administrativa ({feePct}%):</span>
                                    <span className="font-semibold">- R$ {feeVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center text-green-600">
                                    <span>Repasse ao Proprietário:</span>
                                    <span className="font-bold text-lg">R$ {netVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-background rounded-lg border">
                            <p>• A fatura será gerada mensalmente no dia <strong>{dueDay}</strong>.</p>
                            <p>• O repasse ao proprietário será agendado para o dia <strong>{payoutDay}</strong>.</p>
                            <p>• O contrato terá duração de <strong>{duration} meses</strong>.</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button
                        onClick={() => upsertContractMutation.mutate()}
                        disabled={!isValid || upsertContractMutation.isPending}
                    >
                        {upsertContractMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Salvar Alterações" : "Criar Contrato"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
