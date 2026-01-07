import { create } from 'zustand';
import { 
  Cliente, 
  Imovel, 
  Alerta, 
  HistoricoContato, 
  Documento,
  Contrato,
  StatusFunil,
  Corretor,
  Preferencias
} from '@/types/crm';
import { 
  clientesMock, 
  imoveisMock, 
  alertasMock, 
  historicoMock,
  documentosMock,
  contratosMock,
  corretorMock,
  preferenciasMock
} from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';

interface CRMStore {
  // Data
  clientes: Cliente[];
  imoveis: Imovel[];
  alertas: Alerta[];
  historico: HistoricoContato[];
  documentos: Documento[];
  contratos: Contrato[];
  corretor: Corretor;
  preferencias: Preferencias;

  // Cliente actions
  addCliente: (cliente: Omit<Cliente, 'id' | 'created_at' | 'documentos' | 'imoveis_interesse'>) => void;
  updateCliente: (id: string, data: Partial<Cliente>) => void;
  updateClienteStatus: (id: string, status: StatusFunil) => void;
  
  // Imovel actions
  addImovel: (imovel: Omit<Imovel, 'id' | 'created_at' | 'clientes_interessados'>) => void;
  updateImovel: (id: string, data: Partial<Imovel>) => void;
  fetchImoveis: () => Promise<void>;
  
  // Historico actions
  addHistorico: (historico: Omit<HistoricoContato, 'id' | 'created_at'>) => void;
  
  // Documento actions
  addDocumento: (documento: Omit<Documento, 'id' | 'created_at'>) => void;
  
  // Alerta actions
  marcarAlertaLido: (id: string) => void;
  
  // Contrato actions
  addContrato: (contrato: Omit<Contrato, 'id' | 'created_at'>) => void;
  updateContrato: (id: string, data: Partial<Contrato>) => void;

  // Vinculações
  vincularClienteImovel: (clienteId: string, imovelId: string) => void;

  // Configurações actions
  updateCorretor: (data: Partial<Corretor>) => void;
  updatePreferencias: (data: Partial<Preferencias>) => void;
  updatePreferenciasNotificacoes: (data: Partial<Preferencias['notificacoes']>) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useCRMStore = create<CRMStore>((set) => ({
  clientes: clientesMock,
  imoveis: imoveisMock,
  alertas: alertasMock,
  historico: historicoMock,
  documentos: documentosMock,
  contratos: contratosMock,
  corretor: corretorMock,
  preferencias: preferenciasMock,

  addCliente: (cliente) =>
    set((state) => ({
      clientes: [
        ...state.clientes,
        {
          ...cliente,
          id: generateId(),
          created_at: new Date().toISOString(),
          documentos: [],
          imoveis_interesse: [],
        },
      ],
    })),

  updateCliente: (id, data) =>
    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    })),

  updateClienteStatus: (id, status) =>
    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id === id ? { ...c, status_funil: status } : c
      ),
    })),

  addImovel: (imovel) =>
    set((state) => ({
      imoveis: [
        ...state.imoveis,
        {
          ...imovel,
          id: generateId(),
          created_at: new Date().toISOString(),
          clientes_interessados: [],
        },
      ],
    })),

  updateImovel: (id, data) =>
    set((state) => ({
      imoveis: state.imoveis.map((i) =>
        i.id === id ? { ...i, ...data } : i
      ),
    })),

  fetchImoveis: async () => {
    try {
      const { data, error } = await supabase
        .from('imoveis')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map to expected format with clientes_interessados
      const imoveisFormatted = (data || []).map(i => ({
        ...i,
        clientes_interessados: [],
      }));
      
      set({ imoveis: imoveisFormatted as Imovel[] });
    } catch (error) {
      console.error('Erro ao buscar imóveis:', error);
    }
  },

  addHistorico: (historico) =>
    set((state) => ({
      historico: [
        {
          ...historico,
          id: generateId(),
          created_at: new Date().toISOString(),
        },
        ...state.historico,
      ],
    })),

  addDocumento: (documento) =>
    set((state) => ({
      documentos: [
        ...state.documentos,
        {
          ...documento,
          id: generateId(),
          created_at: new Date().toISOString(),
        },
      ],
    })),

  marcarAlertaLido: (id) =>
    set((state) => ({
      alertas: state.alertas.map((a) =>
        a.id === id ? { ...a, lido: true } : a
      ),
    })),

  addContrato: (contrato) =>
    set((state) => ({
      contratos: [
        ...state.contratos,
        {
          ...contrato,
          id: generateId(),
          created_at: new Date().toISOString(),
        },
      ],
    })),

  updateContrato: (id, data) =>
    set((state) => ({
      contratos: state.contratos.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    })),

  vincularClienteImovel: (clienteId, imovelId) =>
    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id === clienteId
          ? { ...c, imoveis_interesse: [...new Set([...c.imoveis_interesse, imovelId])] }
          : c
      ),
      imoveis: state.imoveis.map((i) =>
        i.id === imovelId
          ? { ...i, clientes_interessados: [...new Set([...i.clientes_interessados, clienteId])] }
          : i
      ),
    })),

  updateCorretor: (data) =>
    set((state) => ({
      corretor: { ...state.corretor, ...data },
    })),

  updatePreferencias: (data) =>
    set((state) => ({
      preferencias: { ...state.preferencias, ...data },
    })),

  updatePreferenciasNotificacoes: (data) =>
    set((state) => ({
      preferencias: {
        ...state.preferencias,
        notificacoes: { ...state.preferencias.notificacoes, ...data },
      },
    })),
}));
