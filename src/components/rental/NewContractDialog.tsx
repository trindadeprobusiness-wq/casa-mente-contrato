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

interface NewContractDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewContractDialog({ open, onOpenChange }: NewContractDialogProps) {
    const queryClient = useQueryClient();

    // Form States
    const [clientId, setClientId] = useState("");
    const [propertyId, setPropertyId] = useState("");
    const [rentValue, setRentValue] = useState("");
    const [adminFee, setAdminFee] = useState("10");
    const [startDate, setStartDate] = useState("");
    const [dueDay, setDueDay] = useState("10");
    const [payoutDay, setPayoutDay] = useState("15");
    const [duration, setDuration] = useState("30"); // Months
    const [contractFile, setContractFile] = useState<File | null>(null);

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
    const createContractMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data: corretor } = await supabase.from("corretores").select("id").eq("user_id", user.id).single();
            if (!corretor) throw new Error("Perfil de corretor não encontrado");

            let arquivoPath = null;
            let arquivoUrl = null;

            if (contractFile) {
                const fileExt = contractFile.name.split('.').pop();
                const fileName = `${Date.now()}_contrato.${fileExt}`;
                const filePath = `${corretor.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('documentos')
                    .upload(filePath, contractFile);

                if (uploadError) throw new Error("Erro ao fazer upload do contrato: " + uploadError.message);

                arquivoPath = filePath;
                arquivoUrl = filePath;
            }

            // Estimate end date
            const start = new Date(startDate);
            const end = new Date(start);
            end.setMonth(end.getMonth() + parseInt(duration));

            const { data: contract, error } = await supabase.from("contratos").insert({
                corretor_id: corretor.id,
                cliente_id: clientId,
                imovel_id: propertyId,
                tipo: 'LOCACAO_RESIDENCIAL',
                valor: rent,
                data_inicio: startDate || new Date().toISOString(),
                // data_fim removed as column likely doesn't exist
                dia_vencimento: parseInt(dueDay),
                conteudo: JSON.stringify({
                    obs: "Contrato Gerado Manualmente",
                    dia_repasse: parseInt(payoutDay),
                    taxa_administracao: feePct,
                    meses_duracao: duration,
                    data_fim_calculada: end.toISOString()
                }),
                status: 'ATIVO',
                arquivo_url: arquivoUrl // Storing the path here
            }).select().single();

            if (error) throw error;

            // Generate first bill
            // @ts-ignore
            await supabase.rpc('generate_monthly_rent_bills', { reference_date: new Date().toISOString() });

            return contract;
        },
        onSuccess: () => {
            toast.success("Contrato criado com sucesso!", {
                description: "Faturas iniciais geradas e contrato ativo."
            });
            queryClient.invalidateQueries({ queryKey: ["rental-contracts"] });
            queryClient.invalidateQueries({ queryKey: ["rental-bills"] });
            onOpenChange(false);

            // Reset
            setRentValue("");
            setClientId("");
            setPropertyId("");
            setContractFile(null);
            setStartDate("");
        },
        onError: (err) => {
            toast.error("Erro ao criar contrato: " + err.message);
        }
    });

    const isValid = clientId && propertyId && rentValue && startDate;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
                    <DialogTitle className="text-xl">Novo Contrato de Aluguel</DialogTitle>
                    <DialogDescription>
                        Preencha os dados do contrato. O sistema calculará automaticamente os repasses.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-12 h-[600px] md:h-auto">
                    {/* Left Column: Entities & Structure */}
                    <div className="md:col-span-4 p-6 border-r space-y-6 bg-background">
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wider">
                                <UploadCloud className="w-4 h-4" /> Entidades
                            </h3>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label>Imóvel</Label>
                                    <Select value={propertyId} onValueChange={setPropertyId}>
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
                                    <Select value={clientId} onValueChange={setClientId}>
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
                                            // Auto-adjust payout day
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
                                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                    <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="md:col-span-4 p-6 bg-muted/10 flex flex-col justify-between">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                                Resumo Financeiro
                            </h3>

                            <Card className="border-none shadow-md bg-white dark:bg-card">
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-1 text-center">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Valor Bruto</span>
                                        <div className="text-3xl font-bold text-foreground">
                                            R$ {rent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Comissão ({feePct}%)</span>
                                            <span className="font-medium text-red-500">
                                                - R$ {feeVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="font-semibold text-sm">Repasse Líquido</span>
                                            <span className="text-xl font-bold text-green-600">
                                                R$ {netVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-xs text-blue-700 dark:text-blue-300 space-y-2">
                                <p className="font-medium">Detalhes do Fluxo:</p>
                                <ul className="list-disc pl-4 space-y-1 opacity-90">
                                    <li>Inquilino paga dia <strong>{dueDay}</strong>.</li>
                                    <li>Repasse ao proprietário dia <strong>{payoutDay}</strong>.</li>
                                    <li>Primeira fatura será gerada para <strong>{startDate ? new Date(startDate).toLocaleDateString() : "..."}</strong>.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="pt-6 mt-auto">
                            <Button
                                onClick={() => createContractMutation.mutate()}
                                disabled={!isValid || createContractMutation.isPending}
                                className="w-full h-12 text-base shadow-lg"
                                size="lg"
                            >
                                {createContractMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                Criar Contrato Agora
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="w-full mt-2"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
