import { Link, useLocation } from 'react-router-dom';
import { Grape, Users, Clock, DollarSign, FileText, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';

export default function Navigation() {
  const location = useLocation();
  const { workLabel } = useApp();

  const labelPlural = workLabel.charAt(0).toUpperCase() + workLabel.slice(1) + 's';

  const navItems = [
    { to: '/', label: labelPlural, icon: Grape },
    { to: '/funcionarios', label: 'Equipe', icon: Users },
    { to: '/horas', label: 'Horas', icon: Clock },
    { to: '/adiantamentos', label: 'Adianto', icon: DollarSign },
    { to: '/resumo', label: 'Resumo', icon: BarChart3 },
    { to: '/acerto', label: 'Acerto', icon: FileText },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around py-1.5">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] transition-colors min-w-0',
                active ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
