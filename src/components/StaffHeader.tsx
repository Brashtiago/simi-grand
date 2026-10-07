import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useHotelData } from '@/lib/hotel-data';

interface StaffHeaderProps {
  title: string;
  subtitle?: string;
}

export default function StaffHeader({ title, subtitle }: StaffHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { settings } = useHotelData();

  const handleSignOut = async () => {
    await signOut();
    navigate('/staff-login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1A1C1E]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-white/50 transition-colors hover:text-white/80">
            <ArrowLeft size={16} />
            <span className="hidden text-xs sm:inline">Public Site</span>
          </Link>
          <div className="hidden h-6 w-px bg-white/10 sm:block" />
          <div>
            <h1 className="font-heading text-lg font-medium text-white">{title}</h1>
            {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-white/60">{user?.email}</p>
            <p className="text-xs text-amber-200/60">{user?.role}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200/10">
            <Users size={16} className="text-amber-200" />
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-sm border border-white/20 px-4 py-2 text-xs font-medium text-white/70 transition-all hover:border-white/40 hover:text-white"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
