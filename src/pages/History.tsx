import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ExternalLink, FileText } from 'lucide-react';
import { ReportStorage } from '../services/reportStorage';
import type { Report } from '../types/report';

export default function History() {
    const [reports, setReports] = useState<Report[]>([]);

    const loadReports = () => {
        ReportStorage.getAllReports().then(data => {
            setReports(data.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()));
        });
    };

    useEffect(() => {
        loadReports();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this report?')) {
            await ReportStorage.deleteReport(id);
            loadReports();
        }
    };

    const handleClearAll = async () => {
        if (window.confirm('Are you sure you want to clear ALL reports? This cannot be undone.')) {
            await ReportStorage.clearAllReports();
            loadReports();
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <header>
                    <h2 className="text-3xl font-bold text-slate-800">Report History</h2>
                    <p className="text-slate-500 mt-2">View and manage previously analyzed reports.</p>
                </header>
                {reports.length > 0 && (
                    <button 
                        onClick={handleClearAll}
                        className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Clear All Reports
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {reports.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <div className="bg-slate-100 p-4 rounded-full mb-4">
                            <FileText size={32} className="text-slate-400" />
                        </div>
                        <p className="text-lg mb-2">No reports found</p>
                        <p className="text-sm">Upload a new report to see it here.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                                <th className="p-4 font-medium">Report Name</th>
                                <th className="p-4 font-medium">Date</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Values Analyzed</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map(report => (
                                <tr key={report.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <FileText size={18} className="text-blue-500 shrink-0" />
                                            <div>
                                                <div className="font-bold text-slate-800">{report.patientName || report.fileName}</div>
                                                <div className="text-xs text-slate-400 font-normal">{report.fileName} {report.patientId ? `• ID: ${report.patientId}` : ''}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        {new Date(report.uploadDate).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                                            Completed
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        {report.extractedValues.length} values
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link 
                                                to={`/analysis/${report.id}`} 
                                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors tooltip"
                                                title="Open Report"
                                            >
                                                <ExternalLink size={18} />
                                            </Link>
                                            <button 
                                                onClick={() => handleDelete(report.id)}
                                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete Report"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
