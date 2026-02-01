import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BillsList() {
    return (
        <Card className="border shadow-sm bg-card/50">
            <CardHeader className="pb-4">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Gestão de Faturas
                    </CardTitle>
                    <CardDescription>
                        Controle de cobranças e recebimentos de aluguel
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="text-center py-12 text-muted-foreground bg-muted/20 border rounded-lg">
                    <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
                    <h3 className="text-lg font-medium text-foreground">Módulo em Configuração</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                        As tabelas de faturas de aluguel ainda não foram configuradas no banco de dados.
                        Este módulo estará disponível após a migração do banco.
                    </p>
                    <Button variant="outline" disabled>
                        Em breve
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
