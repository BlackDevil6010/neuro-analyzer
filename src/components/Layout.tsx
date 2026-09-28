import { Outlet, Link, useLocation } from 'react-router-dom';
import { Activity, Upload, Settings, History, ChevronRight } from 'lucide-react';

export default function Layout() {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

    return (
        <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
            {/* Ambient Background Mesh */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.4]">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400 blur-[120px] mix-blend-multiply" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-indigo-300 blur-[150px] mix-blend-multiply" />
                <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[50%] rounded-full bg-emerald-200 blur-[130px] mix-blend-multiply" />
            </div>

            {/* Sidebar */}
            <aside className="no-print w-72 bg-white/85 backdrop-blur-2xl border-r border-slate-200/80 text-slate-600 flex flex-col shadow-[4px_0_30px_rgba(0,0,0,0.03)] z-20 relative">
                <div className="p-7 border-b border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-transparent rounded-bl-full blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3.5 relative z-10">
                        <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center text-white ring-2 ring-indigo-500/20">
                            <Activity size={22} strokeWidth={2.5} className="animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                                Neuro<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500">Analyzer</span>
                            </h1>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                <p className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">NCS Diagnostics Pro</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <nav className="flex-1 p-5 space-y-1.5 overflow-y-auto">
                    <NavItem to="/" icon={<Activity size={18} />} label="Dashboard" active={isActive('/') && location.pathname === '/'} />
                    <NavItem to="/upload" icon={<Upload size={18} />} label="Analyze Report" active={isActive('/upload')} />
                    <NavItem to="/history" icon={<History size={18} />} label="Clinical History" active={isActive('/history')} />
                    
                    <div className="pt-6 pb-2 px-3">
                        <p className="text-[10px] font-black text-slate-400/90 uppercase tracking-widest">Configuration</p>
                    </div>
                    <NavItem to="/settings" icon={<Settings size={18} />} label="Hospital References" active={isActive('/settings')} />
                </nav>

                <div className="p-5">
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-4 shadow-xl shadow-slate-900/10 border border-slate-700/50 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                                <span className="text-[11px] font-black tracking-wider uppercase text-emerald-300">HIPAA Compliant</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">100% On-Device OCR. Zero cloud transmissions.</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative z-10 flex flex-col h-full bg-gradient-to-b from-slate-50/50 via-white/40 to-slate-50/50">
                <div className={location.pathname.startsWith('/analysis') ? "flex-1 h-full overflow-hidden flex flex-col" : "flex-1 p-6 md:p-10"}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

function NavItem({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) {
    return (
        <Link 
            to={to} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                active 
                    ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100/50' 
                    : 'hover:bg-slate-100/50 border border-transparent'
            }`}
        >
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            )}
            <div className={`p-1.5 rounded-lg transition-colors duration-300 ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 group-hover:bg-slate-200/50 group-hover:text-slate-600'}`}>
                {icon}
            </div>
            <span className={`font-semibold text-sm ${active ? 'text-indigo-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                {label}
            </span>
            {active && (
                <ChevronRight size={16} className="ml-auto text-indigo-400 opacity-50" />
            )}
        </Link>
    );
}
