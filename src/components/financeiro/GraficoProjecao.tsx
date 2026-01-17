import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProjecaoMensal } from '@/types/financeiro';

interface GraficoProjecaoProps {
  dados: ProjecaoMensal[];
  metaAnual?: number;
}

export function GraficoProjecao({ dados, metaAnual }: GraficoProjecaoProps) {
  const formatarValor = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value}`;
  };

  const totais = useMemo(() => {
    const totalRealizado = dados
      .filter(d => !d.projetado)
      .reduce((acc, d) => acc + d.lucro, 0);
    
    const totalProjetado = dados.reduce((acc, d) => acc + d.lucro, 0);
    
    return { totalRealizado, totalProjetado };
  }, [dados]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Projeção Anual</CardTitle>
        <CardDescription>
          Realizado: {totais.totalRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | 
          Projetado: {totais.totalProjetado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dados} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="mes"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                tickFormatter={formatarValor}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                  name === 'receita' ? 'Receita' : name === 'despesa' ? 'Despesa' : 'Lucro'
                ]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload as ProjecaoMensal;
                  return `${label} ${item?.projetado ? '(Projetado)' : '(Realizado)'}`;
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="receita"
                name="Receita"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorReceita)"
              />
              <Area
                type="monotone"
                dataKey="despesa"
                name="Despesa"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDespesa)"
              />
              {metaAnual && (
                <ReferenceLine 
                  y={metaAnual / 12} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="3 3"
                  label={{ 
                    value: 'Meta Mensal', 
                    fill: 'hsl(var(--primary))',
                    position: 'right'
                  }} 
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
