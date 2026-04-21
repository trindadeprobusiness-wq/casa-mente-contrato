import { useEffect, useState } from 'react';
import { useCRMStore } from '@/stores/crmStore';
import { Loader2 } from 'lucide-react';
import { useUTMTracker } from '@/hooks/useUTMTracker';

interface DataLoaderProps {
  children: React.ReactNode;
}

export function DataLoader({ children }: DataLoaderProps) {
  useUTMTracker(); // intercepta as UTMs globais
  const [loading, setLoading] = useState(true);
  const { fetchClientes, fetchImoveis, fetchContratos, fetchCorretor, fetchAlertas } = useCRMStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchCorretor().catch(e => console.error("Corretor falhou:", e)),
          fetchClientes().catch(e => console.error("Clientes falhou:", e)),
          fetchImoveis().catch(e => console.error("Imoveis falhou:", e)),
          fetchContratos().catch(e => console.error("Contratos falhou:", e)),
          fetchAlertas().catch(e => console.error("Alertas falhou:", e)),
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchClientes, fetchImoveis, fetchContratos, fetchCorretor, fetchAlertas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
