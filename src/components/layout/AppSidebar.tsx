import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Building2, BarChart3, Scale, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import oliverLogo from '@/assets/oliver-logo.png';

const menuItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Building2, label: 'Imóveis', path: '/imoveis' },
  { icon: BarChart3, label: 'Funil de Vendas', path: '/funil' },
  { icon: Scale, label: 'Jurídico', path: '/juridico' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-sidebar-border',
        collapsed ? 'justify-center p-3' : 'px-4 py-5'
      )}>
        <img 
          src={oliverLogo} 
          alt="Oliver Negócios Inteligentes" 
          className={cn(
            'object-contain transition-all duration-300',
            collapsed ? 'w-10 h-10' : 'w-full h-16'
          )}
        />
      </div>

      {/* Tagline */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60 font-medium">
            Seu Segundo Cérebro
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive && 'bg-sidebar-primary text-sidebar-primary-foreground',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Button */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed && 'px-0'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-xs">Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
