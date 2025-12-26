import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { Home, Users, Building2, BarChart3, Scale, Settings } from 'lucide-react';
import { useState } from 'react';
import oliverLogo from '@/assets/oliver-logo.png';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function AppSidebar() {
  const [open, setOpen] = useState(false);

  const links = [
    { label: 'Início', href: '/', icon: <Home className="h-5 w-5 flex-shrink-0" /> },
    { label: 'Clientes', href: '/clientes', icon: <Users className="h-5 w-5 flex-shrink-0" /> },
    { label: 'Imóveis', href: '/imoveis', icon: <Building2 className="h-5 w-5 flex-shrink-0" /> },
    { label: 'Funil de Vendas', href: '/funil', icon: <BarChart3 className="h-5 w-5 flex-shrink-0" /> },
    { label: 'Jurídico', href: '/juridico', icon: <Scale className="h-5 w-5 flex-shrink-0" /> },
    { label: 'Configurações', href: '/configuracoes', icon: <Settings className="h-5 w-5 flex-shrink-0" /> },
  ];

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10 bg-sidebar border-r border-sidebar-border">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <Logo open={open} />
          <div className="mt-8 flex flex-col gap-2">
            {links.map((link, idx) => (
              <SidebarLink
                key={idx}
                link={link}
                className={cn(
                  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2",
                  "transition-all duration-200"
                )}
              />
            ))}
          </div>
        </div>
      </SidebarBody>
    </Sidebar>
  );
}

const Logo = ({ open }: { open: boolean }) => {
  return (
    <div className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20 px-1">
      <Link to="/" className='flex-shrink-0'>
        <img
          src={oliverLogo}
          className="h-8 w-auto flex-shrink-0"
          alt="Oliver Negócios Inteligentes"
        />
      </Link>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0 }}
        className="font-medium text-sidebar-foreground whitespace-pre flex flex-col overflow-hidden"
      >
        <span className="font-semibold text-sm">OLIVER</span>
        <span className="text-xs text-sidebar-foreground/70">Negócios Inteligentes</span>
      </motion.div>
    </div>
  );
};
