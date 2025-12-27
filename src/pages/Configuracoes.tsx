import { useState } from 'react';
import { useCRMStore } from '@/stores/crmStore';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Bell, 
  Palette, 
  Save,
  Camera,
  Building2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import type { TemaAparencia, FormatoMoeda, OrdenacaoClientes } from '@/types/crm';

const Configuracoes = () => {
  const { toast } = useToast();
  const { 
    corretor, 
    preferencias, 
    updateCorretor, 
    updatePreferencias,
    updatePreferenciasNotificacoes 
  } = useCRMStore();

  // Local state for form editing
  const [perfilForm, setPerfilForm] = useState({
    nome: corretor.nome,
    creci: corretor.creci,
    creci_estado: corretor.creci_estado,
    email: corretor.email,
    telefone: corretor.telefone,
    endereco: corretor.endereco || '',
    website: corretor.website || '',
    razao_social: corretor.razao_social || '',
    cnpj_cpf: corretor.cnpj_cpf || '',
    endereco_completo: corretor.endereco_completo || '',
  });

  const handleSalvarPerfil = () => {
    updateCorretor(perfilForm);
    toast({
      title: 'Perfil atualizado',
      description: 'Suas informações foram salvas com sucesso.',
    });
  };

  const handleToggleNotificacao = (key: keyof typeof preferencias.notificacoes) => {
    updatePreferenciasNotificacoes({ [key]: !preferencias.notificacoes[key] });
    toast({
      title: 'Preferência atualizada',
      description: 'Configuração de notificação alterada.',
    });
  };

  const handleAlterarAntecedencia = (tipo: 'exclusividade' | 'documento', dias: number) => {
    if (tipo === 'exclusividade') {
      updatePreferencias({ antecedencia_exclusividade_dias: dias });
    } else {
      updatePreferencias({ antecedencia_documento_dias: dias });
    }
    toast({
      title: 'Antecedência atualizada',
      description: `Alertas serão enviados com ${dias} dias de antecedência.`,
    });
  };

  const handleAlterarTema = (tema: TemaAparencia) => {
    updatePreferencias({ tema });
    toast({
      title: 'Tema alterado',
      description: `Tema ${tema === 'light' ? 'claro' : tema === 'dark' ? 'escuro' : 'do sistema'} aplicado.`,
    });
  };

  const handleAlterarPreferencia = <K extends keyof typeof preferencias>(
    key: K, 
    value: typeof preferencias[K]
  ) => {
    updatePreferencias({ [key]: value });
    toast({
      title: 'Preferência salva',
      description: 'Configuração atualizada com sucesso.',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu perfil, notificações e preferências do sistema
        </p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="perfil" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
        </TabsList>

        {/* Tab Perfil */}
        <TabsContent value="perfil" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Corretor
              </CardTitle>
              <CardDescription>
                Informações pessoais e profissionais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Foto de Perfil */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={corretor.foto_url} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(corretor.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Alterar foto
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG ou GIF. Máx 2MB.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Dados Pessoais */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={perfilForm.nome}
                    onChange={(e) => setPerfilForm({ ...perfilForm, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={perfilForm.email}
                    onChange={(e) => setPerfilForm({ ...perfilForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={perfilForm.telefone}
                    onChange={(e) => setPerfilForm({ ...perfilForm, telefone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="creci">CRECI</Label>
                    <Input
                      id="creci"
                      value={perfilForm.creci}
                      onChange={(e) => setPerfilForm({ ...perfilForm, creci: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creci_estado">Estado</Label>
                    <Select
                      value={perfilForm.creci_estado}
                      onValueChange={(value) => setPerfilForm({ ...perfilForm, creci_estado: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endereco">Endereço Comercial</Label>
                  <Input
                    id="endereco"
                    value={perfilForm.endereco}
                    onChange={(e) => setPerfilForm({ ...perfilForm, endereco: e.target.value })}
                    placeholder="Ex: Av. Paulista, 1000 - São Paulo/SP"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="website">Website / Redes Sociais</Label>
                  <Input
                    id="website"
                    value={perfilForm.website}
                    onChange={(e) => setPerfilForm({ ...perfilForm, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados para Contratos
              </CardTitle>
              <CardDescription>
                Informações utilizadas na geração de contratos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social / Nome Fantasia</Label>
                  <Input
                    id="razao_social"
                    value={perfilForm.razao_social}
                    onChange={(e) => setPerfilForm({ ...perfilForm, razao_social: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj_cpf">CNPJ ou CPF</Label>
                  <Input
                    id="cnpj_cpf"
                    value={perfilForm.cnpj_cpf}
                    onChange={(e) => setPerfilForm({ ...perfilForm, cnpj_cpf: e.target.value })}
                    placeholder="00.000.000/0000-00 ou 000.000.000-00"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endereco_completo">Endereço Completo (para contratos)</Label>
                  <Input
                    id="endereco_completo"
                    value={perfilForm.endereco_completo}
                    onChange={(e) => setPerfilForm({ ...perfilForm, endereco_completo: e.target.value })}
                    placeholder="Rua, número, complemento, bairro, cidade/UF - CEP"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSalvarPerfil} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Salvar Alterações
            </Button>
          </div>
        </TabsContent>

        {/* Tab Notificações */}
        <TabsContent value="notificacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferências de Alertas
              </CardTitle>
              <CardDescription>
                Configure quais notificações deseja receber
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Follow-ups Atrasados</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber alertas quando um follow-up estiver atrasado
                    </p>
                  </div>
                  <Switch
                    checked={preferencias.notificacoes.followup_atrasado}
                    onCheckedChange={() => handleToggleNotificacao('followup_atrasado')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Exclusividade de Imóveis</Label>
                    <p className="text-sm text-muted-foreground">
                      Alertar quando contratos de exclusividade estiverem vencendo
                    </p>
                  </div>
                  <Switch
                    checked={preferencias.notificacoes.exclusividade_vencendo}
                    onCheckedChange={() => handleToggleNotificacao('exclusividade_vencendo')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Documentos Vencendo</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber alertas sobre documentos próximos do vencimento
                    </p>
                  </div>
                  <Switch
                    checked={preferencias.notificacoes.documento_vencendo}
                    onCheckedChange={() => handleToggleNotificacao('documento_vencendo')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Novos Clientes</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar quando novos clientes forem cadastrados
                    </p>
                  </div>
                  <Switch
                    checked={preferencias.notificacoes.novo_cliente}
                    onCheckedChange={() => handleToggleNotificacao('novo_cliente')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Antecedência de Alertas</CardTitle>
              <CardDescription>
                Defina com quantos dias de antecedência deseja ser alertado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Exclusividade de Imóveis</Label>
                  <Select
                    value={String(preferencias.antecedencia_exclusividade_dias)}
                    onValueChange={(value) => handleAlterarAntecedencia('exclusividade', Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 dias antes</SelectItem>
                      <SelectItem value="5">5 dias antes</SelectItem>
                      <SelectItem value="7">7 dias antes</SelectItem>
                      <SelectItem value="15">15 dias antes</SelectItem>
                      <SelectItem value="30">30 dias antes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Documentos</Label>
                  <Select
                    value={String(preferencias.antecedencia_documento_dias)}
                    onValueChange={(value) => handleAlterarAntecedencia('documento', Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 dias antes</SelectItem>
                      <SelectItem value="10">10 dias antes</SelectItem>
                      <SelectItem value="15">15 dias antes</SelectItem>
                      <SelectItem value="30">30 dias antes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Aparência */}
        <TabsContent value="aparencia" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Tema do Sistema
              </CardTitle>
              <CardDescription>
                Escolha como o sistema deve aparecer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={preferencias.tema}
                onValueChange={(value) => handleAlterarTema(value as TemaAparencia)}
                className="grid grid-cols-3 gap-4"
              >
                <Label
                  htmlFor="tema-light"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
                >
                  <RadioGroupItem value="light" id="tema-light" className="sr-only" />
                  <div className="h-8 w-8 rounded-full bg-background border shadow-sm mb-2" />
                  <span className="text-sm font-medium">Claro</span>
                </Label>
                <Label
                  htmlFor="tema-dark"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
                >
                  <RadioGroupItem value="dark" id="tema-dark" className="sr-only" />
                  <div className="h-8 w-8 rounded-full bg-slate-900 border shadow-sm mb-2" />
                  <span className="text-sm font-medium">Escuro</span>
                </Label>
                <Label
                  htmlFor="tema-system"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
                >
                  <RadioGroupItem value="system" id="tema-system" className="sr-only" />
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-background to-slate-900 border shadow-sm mb-2" />
                  <span className="text-sm font-medium">Sistema</span>
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Opções de Exibição</CardTitle>
              <CardDescription>
                Personalize como os dados são apresentados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sidebar Sempre Expandida</Label>
                  <p className="text-sm text-muted-foreground">
                    Manter o menu lateral sempre aberto
                  </p>
                </div>
                <Switch
                  checked={preferencias.sidebar_expandida}
                  onCheckedChange={(checked) => handleAlterarPreferencia('sidebar_expandida', checked)}
                />
              </div>

              <Separator />

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Formato de Moeda</Label>
                  <Select
                    value={preferencias.formato_moeda}
                    onValueChange={(value) => handleAlterarPreferencia('formato_moeda', value as FormatoMoeda)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completo">Completo (R$ 450.000)</SelectItem>
                      <SelectItem value="abreviado">Abreviado (R$ 450k)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ordenação Padrão de Clientes</Label>
                  <Select
                    value={preferencias.ordenacao_clientes}
                    onValueChange={(value) => handleAlterarPreferencia('ordenacao_clientes', value as OrdenacaoClientes)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nome">Por Nome</SelectItem>
                      <SelectItem value="ultimo_contato">Por Último Contato</SelectItem>
                      <SelectItem value="created_at">Por Data de Cadastro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
