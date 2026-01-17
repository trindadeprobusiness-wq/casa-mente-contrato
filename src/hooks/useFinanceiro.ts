import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCRMStore } from '@/stores/crmStore';
import { 
  LancamentoFinanceiro, 
  TipoLancamento, 
  CategoriaFinanceira,
  ResumoFinanceiro,
  LancamentoPorCategoria,
  ProjecaoMensal
} from '@/types/financeiro';
import { startOfMonth, endOfMonth, format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FiltrosLancamento {
  tipo?: TipoLancamento;
  categoria?: CategoriaFinanceira;
  dataInicio?: Date;
  dataFim?: Date;
}

interface NovoLancamento {
  tipo: TipoLancamento;
  categoria: CategoriaFinanceira;
  descricao: string;
  valor: number;
  data: string;
  recorrente?: boolean;
  contrato_id?: string;
  imovel_id?: string;
}

export function useFinanceiro() {
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [loading, setLoading] = useState(false);
  const { corretor } = useCRMStore();

  const fetchLancamentos = useCallback(async (filtros?: FiltrosLancamento) => {
    if (!corretor?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('lancamentos_financeiros')
        .select('*')
        .eq('corretor_id', corretor.id)
        .order('data', { ascending: false });

      if (filtros?.tipo) {
        query = query.eq('tipo', filtros.tipo);
      }
      if (filtros?.categoria) {
        query = query.eq('categoria', filtros.categoria);
      }
      if (filtros?.dataInicio) {
        query = query.gte('data', format(filtros.dataInicio, 'yyyy-MM-dd'));
      }
      if (filtros?.dataFim) {
        query = query.lte('data', format(filtros.dataFim, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) throw error;
      setLancamentos(data as LancamentoFinanceiro[]);
      return data as LancamentoFinanceiro[];
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [corretor?.id]);

  const addLancamento = useCallback(async (novoLancamento: NovoLancamento) => {
    if (!corretor?.id) throw new Error('Corretor não encontrado');

    const { data, error } = await supabase
      .from('lancamentos_financeiros')
      .insert({
        ...novoLancamento,
        corretor_id: corretor.id,
        recorrente: novoLancamento.recorrente ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    
    setLancamentos(prev => [data as LancamentoFinanceiro, ...prev]);
    return data as LancamentoFinanceiro;
  }, [corretor?.id]);

  const updateLancamento = useCallback(async (id: string, updates: Partial<NovoLancamento>) => {
    const { data, error } = await supabase
      .from('lancamentos_financeiros')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    setLancamentos(prev => prev.map(l => l.id === id ? data as LancamentoFinanceiro : l));
    return data as LancamentoFinanceiro;
  }, []);

  const deleteLancamento = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('lancamentos_financeiros')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    setLancamentos(prev => prev.filter(l => l.id !== id));
  }, []);

  const calcularResumo = useCallback((dados?: LancamentoFinanceiro[]): ResumoFinanceiro => {
    const lista = dados || lancamentos;
    
    const receita_total = lista
      .filter(l => l.tipo === 'RECEITA')
      .reduce((acc, l) => acc + Number(l.valor), 0);
    
    const despesa_total = lista
      .filter(l => l.tipo === 'DESPESA')
      .reduce((acc, l) => acc + Number(l.valor), 0);
    
    const lucro = receita_total - despesa_total;
    const margem = receita_total > 0 ? (lucro / receita_total) * 100 : 0;

    return { receita_total, despesa_total, lucro, margem };
  }, [lancamentos]);

  const calcularPorCategoria = useCallback((tipo: TipoLancamento, dados?: LancamentoFinanceiro[]): LancamentoPorCategoria[] => {
    const lista = (dados || lancamentos).filter(l => l.tipo === tipo);
    const total = lista.reduce((acc, l) => acc + Number(l.valor), 0);
    
    const porCategoria = lista.reduce((acc, l) => {
      if (!acc[l.categoria]) {
        acc[l.categoria] = 0;
      }
      acc[l.categoria] += Number(l.valor);
      return acc;
    }, {} as Record<CategoriaFinanceira, number>);

    return Object.entries(porCategoria)
      .map(([categoria, valor]) => ({
        categoria: categoria as CategoriaFinanceira,
        total: valor,
        percentual: total > 0 ? (valor / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [lancamentos]);

  const calcularProjecaoAnual = useCallback(async (): Promise<ProjecaoMensal[]> => {
    if (!corretor?.id) return [];

    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    const fimAno = new Date(hoje.getFullYear(), 11, 31);

    const { data, error } = await supabase
      .from('lancamentos_financeiros')
      .select('*')
      .eq('corretor_id', corretor.id)
      .gte('data', format(inicioAno, 'yyyy-MM-dd'))
      .lte('data', format(fimAno, 'yyyy-MM-dd'));

    if (error) throw error;

    const lancamentosAno = data as LancamentoFinanceiro[];
    const meses: ProjecaoMensal[] = [];

    // Calcular média dos meses passados para projeção
    const mesesPassados = hoje.getMonth();
    let somaReceitas = 0;
    let somaDespesas = 0;

    for (let i = 0; i < 12; i++) {
      const mesData = new Date(hoje.getFullYear(), i, 1);
      const mesStr = format(mesData, 'yyyy-MM');
      
      const lancamentosMes = lancamentosAno.filter(l => l.data.startsWith(mesStr));
      
      const receita = lancamentosMes
        .filter(l => l.tipo === 'RECEITA')
        .reduce((acc, l) => acc + Number(l.valor), 0);
      
      const despesa = lancamentosMes
        .filter(l => l.tipo === 'DESPESA')
        .reduce((acc, l) => acc + Number(l.valor), 0);

      const projetado = i > hoje.getMonth();

      if (!projetado) {
        somaReceitas += receita;
        somaDespesas += despesa;
      }

      meses.push({
        mes: format(mesData, 'MMM', { locale: ptBR }),
        receita: projetado ? (mesesPassados > 0 ? somaReceitas / mesesPassados : 0) : receita,
        despesa: projetado ? (mesesPassados > 0 ? somaDespesas / mesesPassados : 0) : despesa,
        lucro: projetado 
          ? (mesesPassados > 0 ? (somaReceitas - somaDespesas) / mesesPassados : 0)
          : receita - despesa,
        projetado,
      });
    }

    return meses;
  }, [corretor?.id]);

  const getLancamentosMesAtual = useCallback(async () => {
    const inicio = startOfMonth(new Date());
    const fim = endOfMonth(new Date());
    return fetchLancamentos({ dataInicio: inicio, dataFim: fim });
  }, [fetchLancamentos]);

  return {
    lancamentos,
    loading,
    fetchLancamentos,
    addLancamento,
    updateLancamento,
    deleteLancamento,
    calcularResumo,
    calcularPorCategoria,
    calcularProjecaoAnual,
    getLancamentosMesAtual,
  };
}
