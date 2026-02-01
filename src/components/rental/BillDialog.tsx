import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface BillDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    billToEdit?: any;
}

export function BillDialog({ open, onOpenChange, billToEdit }: BillDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{billToEdit ? "Editar Fatura" : "Nova Fatura Manual"}</DialogTitle>
                </DialogHeader>
                <div className="py-6 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
                    <p className="text-sm text-muted-foreground">
                        Este recurso estará disponível após a configuração das tabelas de faturas no banco de dados.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
