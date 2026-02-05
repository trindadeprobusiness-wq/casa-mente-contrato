import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wallet, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BillsList() {
    return (
        <div className="space-y-6">
            <Card className="border shadow-sm bg-card/50">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        Gestão de Faturas
                    </CardTitle>
                    <CardDescription>
                        Controle inteligente de cobranças
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                        <Settings className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3 animate-pulse" />
                        <h3 className="text-lg font-medium text-foreground">Módulo em Configuração</h3>
                        <p className="text-sm max-w-md mx-auto mt-2">
                            A gestão de faturas será habilitada após a criação das tabelas no banco de dados.
                            As faturas serão geradas automaticamente a partir dos contratos ativos.
                        </p>
                        <Button variant="outline" className="mt-4" disabled>
                            <FileText className="mr-2 h-4 w-4" />
                            Aguardando Migração
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
