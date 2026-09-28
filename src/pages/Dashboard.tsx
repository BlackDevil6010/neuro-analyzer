import React, { useEffect, useState } from 'react';
import { FileText, Activity, Clock, Upload, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReportStorage } from '../services/reportStorage';
import type { Report } from '../types/report';

export default function Dashboard() {
    const [reports, setReports] = useState<Report[]>([]);
    
    useEffect(() => {
        ReportStorage.getAllReports().then((data: Report[]) => {
            setReports(data.sort((a: Report, b: Report) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()));
        });
    }, []);

    const totalAnalyzed = reports.filter(r => r.analysisStatus === 'completed').length;
    const totalValues = reports.reduce((acc, curr) => acc + curr.extractedValues.length, 0);

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-12 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold tracking-wide uppercase mb-4">
                    <Sparkles size={14} className="animate-pulse" /> Welcome to NeuroAnalyzer
                </div>
                <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">Overview Dashboard</h2>
                <p className="text-slate-500 mt-3 text-base font-medium max-w-xl">Analyze NCS/EMG reports against hospital reference values securely and instantly.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <StatCard icon={<FileText />} title="Total Reports" value={reports.length} color="blue" />
                <StatCard icon={<Activity />} title="Analyzed Reports" value={totalAnalyzed} color="emerald" />
                <StatCard icon={<Clock />} title="Pending Reports" value={reports.length - totalAnalyzed} color="amber" />
                <StatCard icon={<Activity />} title="Values Analyzed" value={totalValues} color="indigo" />
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-white overflow-hidden relative">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent opacity-50" />
                
                <div className="p-8 flex justify-between items-center bg-gradient-to-b from-white/50 to-transparent">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Recent Reports</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">Your latest clinical data extractions</p>
                    </div>
                    <Link to="/upload" className="group bg-slate-900 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2.5 transition-all duration-300 shadow-lg shadow-slate-900/20 hover:shadow-indigo-500/30 transform hover:-translate-y-0.5">
                        <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                        Analyze New Report
                    </Link>
                </div>
                
                {reports.length === 0 ? (
                    <div className="p-20 text-center text-slate-500 flex flex-col items-center">
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-full mb-6 border border-white shadow-xl shadow-indigo-100/50 relative group cursor-pointer hover:scale-105 transition-transform duration-500">
                            <div className="absolute inset-0 bg-indigo-400 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                            <FileText size={48} className="text-indigo-500 relative z-10" />
                        </div>
                        <p className="text-2xl font-extrabold text-slate-800 mb-3 tracking-tight">No reports analyzed yet</p>
                        <p className="text-slate-500 max-w-sm text-base">Upload your first NCS/EMG report to extract data and calculate clinical differences instantly.</p>
                        <Link to="/upload" className="mt-8 text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-2 group">
                            Get started <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-widest">
                                    <th className="px-8 py-5">File Name</th>
                                    <th className="px-8 py-5">Date</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5">Values</th>
                                    <th className="px-8 py-5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/80">
                                {reports.slice(0, 5).map(report => (
                                    <tr key={report.id} className="hover:bg-slate-50/80 transition-colors duration-200 group">
                                        <td className="px-8 py-5 font-semibold text-slate-700">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-white text-indigo-400 p-2.5 rounded-xl border border-slate-100 shadow-sm group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500 transition-all duration-300">
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{report.patientName || report.fileName}</div>
                                                    <div className="text-xs text-slate-400 font-normal">{report.fileName} {report.patientId ? `• ID: ${report.patientId}` : ''}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-medium text-slate-500">{new Date(report.uploadDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                        <td className="px-8 py-5">
                                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100/50 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                {report.analysisStatus}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-sm font-bold">{report.extractedValues.length}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <Link to={`/analysis/${report.id}`} className="text-indigo-600 hover:text-indigo-700 font-bold text-sm bg-indigo-50 px-5 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm">
                                                    Open
                                                </Link>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this report?')) {
                                                            ReportStorage.deleteReport(report.id);
                                                            setReports(reports.filter(r => r.id !== report.id));
                                                        }
                                                    }}
                                                    className="text-slate-500 hover:text-red-600 font-bold text-sm bg-slate-50 px-5 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
                                                    title="Delete Report"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: number | string, color: 'blue' | 'emerald' | 'amber' | 'indigo' }) {
    const colors = {
        blue: 'from-blue-500 to-cyan-500 text-white shadow-blue-500/20',
        emerald: 'from-emerald-400 to-emerald-500 text-white shadow-emerald-500/20',
        amber: 'from-amber-400 to-orange-500 text-white shadow-amber-500/20',
        indigo: 'from-indigo-500 to-purple-500 text-white shadow-indigo-500/20',
    };
    
    return (
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-white flex flex-col gap-5 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 duration-300 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors[color]} rounded-bl-full opacity-5 blur-2xl group-hover:opacity-10 transition-opacity duration-500`} />
            
            <div className={`w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br ${colors[color]} shadow-lg relative z-10 transform group-hover:scale-105 transition-transform duration-300`}>
                {React.cloneElement(icon as React.ReactElement<any>, { size: 24, strokeWidth: 2.5 })}
            </div>
            <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-1.5">{title}</p>
                <p className="text-4xl font-black text-slate-800 tracking-tight">{value}</p>
            </div>
        </div>
    );
}
