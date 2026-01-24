import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { ContractUpload } from "./ContractUpload";

interface NewContractDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewContractDialog({ open, onOpenChange }: NewContractDialogProps) {
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);

    // Form States
    const [clientId, setClientId] = useState("");
    const [propertyId, setPropertyId] = useState("");
    const [rentValue, setRentValue] = useState("");
    const [adminFee, setAdminFee] = useState("10");
    const [startDate, setStartDate] = useState("");
    const [dueDay, setDueDay] = useState("10");
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
            const { data } = await supabase.from("imoveis").select("id, titulo, proprietario_nome").eq("ativo", true).order("titulo");
            return data || [];
        }
    });

    // Calculations
    const rent = parseFloat(rentValue) || 0;
    const feePct = parseFloat(adminFee) || 0;
    const feeVal = rent * (feePct / 100);
    const netVal = rent - feeVal;

    // Mutation
    const createContractMutation = useMutation({
        mutationFn: async () => {
            // 1. Get user (corretor)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data: corretor } = await supabase.from("corretores").select("id").eq("user_id", user.id).single();
            if (!corretor) throw new Error("Perfil de corretor não encontrado");

            // 2. Upload Contract File (if any)
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
                // Note: bucket is private, so 'arquivo_url' will store the path or we can generate a signed URL on view
                // We'll store the path in 'arquivo_url' column for reference, or clearer: use 'arquivo_url' as file identifier
                arquivoUrl = filePath;
            }

            // 3. Insert Contract
            const { data: contract, error } = await supabase.from("contratos").insert({
                corretor_id: corretor.id,
                cliente_id: clientId,
                imovel_id: propertyId,
                tipo: 'LOCACAO_RESIDENCIAL',
                valor: rent,
                taxa_administracao_percentual: feePct,
                data_inicio: startDate || new Date().toISOString(),
                dia_vencimento_aluguel: parseInt(dueDay),
                dia_repasse_proprietario: parseInt(dueDay) + 5,
                conteudo: "Contrato Gerado Manualmente",
                status: 'ATIVO',
                arquivo_url: arquivoUrl // Storing the path here
            }).select().single();

            if (error) throw error;

            if (error) throw error;

            // 4. Generate Bills Immediately
            // @ts-ignore
            await supabase.rpc('generate_monthly_rent_bills', { reference_date: new Date().toISOString() });

            return contract;
        },
        onSuccess: () => {
            toast.success("Contrato criado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["rental-contracts"] });
            queryClient.invalidateQueries({ queryKey: ["rental-bills"] }); // Update bills too
            onOpenChange(false);
            setStep(1);
            // Reset form
            setRentValue("");
            setClientId("");
            setPropertyId("");
            setContractFile(null);
        },
        onError: (err) => {
            toast.error("Erro ao criar contrato: " + err.message);
        }
    });

    const isStep1Valid = clientId && propertyId;
    const isStep2Valid = rentValue && startDate;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Novo Contrato de Aluguel</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <Label>Inquilino (Cliente)</Label>
                                <Select value={clientId} onValueChange={setClientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um cliente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients?.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Imóvel</Label>
                                <Select value={propertyId} onValueChange={setPropertyId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um imóvel..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {properties?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.titulo} ({p.proprietario_nome})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Valor do Aluguel (R$)</Label>
                                    <Input
                                        type="number"
                                        value={rentValue}
                                        onChange={e => setRentValue(e.target.value)}
                                        placeholder="Ex: 2500.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Taxa Adm (%)</Label>
                                    <Input
                                        type="number"
                                        value={adminFee}
                                        onChange={e => setAdminFee(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Contrato Assinado (Opcional)</Label>
                                <ContractUpload onFileSelect={setContractFile} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Data Início</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dia Vencimento</Label>
                                    <Select value={dueDay} onValueChange={setDueDay}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[5, 10, 15, 20, 25, 30].map(d => (
                                                <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Intelligent Preview */}
                            <Card className="bg-muted/50 border-dashed">
                                <CardContent className="pt-4 flex justify-between items-center">
                                    <div className="text-sm">
                                        <div className="text-muted-foreground">Repasse ao Proprietário</div>
                                        <div className="font-semibold text-green-600 text-lg">
                                            R$ {netVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div className="text-right text-sm">
                                        <div className="text-muted-foreground">Sua Comissão</div>
                                        <div>R$ {feeVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    {step === 1 ? (
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    ) : (
                        <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                    )}

                    {step === 1 ? (
                        <Button onClick={() => setStep(2)} disabled={!isStep1Valid}>
                            Próximo
                        </Button>
                    ) : (
                        <Button onClick={() => createContractMutation.mutate()} disabled={!isStep2Valid || createContractMutation.isPending}>
                            {createContractMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Criar Contrato
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
