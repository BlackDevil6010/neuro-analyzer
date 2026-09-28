import { useEffect, useState, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, FileText, RotateCcw, RotateCw, LayoutGrid, List } from 'lucide-react';
import { ReportStorage } from '../services/reportStorage';
import type { Report, MotorNCSGroup } from '../types/report';
import { calculateResult, getNerveReference } from '../utils/calculations';
import { generateAnalyzedPDF } from '../services/pdfService';
import { getDefaultMotorNCSGroups } from '../services/extractionService';

export default function Analysis() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [viewMode, setViewMode] = useState<'clinical' | 'itemized'>('clinical');
    const [previewRotation, setPreviewRotation] = useState<number>(0);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            ReportStorage.getReport(id).then(data => {
                if (data) {
                    if (!data.motorNcsGroups || data.motorNcsGroups.length === 0) {
                        data.motorNcsGroups = getDefaultMotorNCSGroups();
                    }
                    if (!data.physician) {
                        data.physician = 'Dr. TCR.Ramakrishnan MDDM(Neuro)';
                    }
                    if (!data.patientName) data.patientName = 'Mr.Dhandapani A';
                    if (!data.patientId) data.patientId = '202511100114';
                    if (!data.gender) data.gender = 'Male';
                    if (!data.dob) data.dob = '01-07-1955';
                    if (!data.age) data.age = '71 Years';
                    if (!data.visitDate) data.visitDate = '28-09-2026 11:49';
                    if (!data.hospitalName) data.hospitalName = 'K G HOSPITAL';
                    if (!data.hospitalLocation) data.hospitalLocation = 'COIMBATORE';
                    if (!data.labName) data.labName = 'NeuroPhysiology Lab';
                    if (!data.reportTitle) data.reportTitle = 'NCS/EP/EMG REPORTS';
                    if (!data.logoBase64) data.logoBase64 = '/hospital-logo.png';
                    if (!data.totalPages) data.totalPages = 3;
                    setReport(data);
                    if (data.fileData && data.fileType) {
                        const blob = new Blob([data.fileData], { type: data.fileType });
                        setPreviewUrl(URL.createObjectURL(blob));
                    }
                }
                setLoading(false);
            });
        }
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [id]);

    const handleMotorSiteChange = (
        groupIndex: number, 
        siteIndex: number, 
        field: 'latency' | 'amplitude' | 'duration' | 'relAmp' | 'segment' | 'latDiff' | 'velocity' | 'distance',
        rawVal: string
    ) => {
        if (!report) return;

        const currentGroups: MotorNCSGroup[] = report.motorNcsGroups ? [...report.motorNcsGroups] : getDefaultMotorNCSGroups();
        const group = { ...currentGroups[groupIndex] };
        const sites = [...group.sites];
        const site = { ...sites[siteIndex] };

        let numVal: number | null = null;
        if (rawVal !== '' && rawVal !== 'NR' && !isNaN(Number(rawVal))) {
            numVal = parseFloat(rawVal);
        }

        if (field === 'latency') {
            site.latency = rawVal === 'NR' ? 'NR' : numVal;
        } else if (field === 'amplitude') {
            site.amplitude = rawVal === 'NR' ? 'NR' : numVal;
        } else if (field === 'velocity') {
            site.velocity = rawVal === 'NR' ? 'NR' : numVal;
        } else if (field === 'duration' || field === 'relAmp' || field === 'latDiff' || field === 'distance') {
            (site as any)[field] = rawVal === 'NR' ? 'NR' : (numVal !== null ? numVal : rawVal);
        } else {
            (site as any)[field] = rawVal;
        }

        sites[siteIndex] = site;
        group.sites = sites;
        currentGroups[groupIndex] = group;

        // Also update corresponding extracted value if linked
        let updatedExtracted = [...report.extractedValues];
        let targetExtractedId: string | undefined;

        if (field === 'latency' && site.latencyValId) targetExtractedId = site.latencyValId;
        if (field === 'amplitude' && site.amplitudeValId) targetExtractedId = site.amplitudeValId;
        if (field === 'velocity' && site.velocityValId) targetExtractedId = site.velocityValId;

        if (targetExtractedId) {
            updatedExtracted = updatedExtracted.map(ext => {
                if (ext.id === targetExtractedId) {
                    return { ...ext, value: numVal, isCorrected: true };
                }
                return ext;
            });
        }

        const updatedCalculated = updatedExtracted.map(ext => {
            const calc = calculateResult(ext.parameter, ext.value || 0, report.referenceValues);
            return {
                extractedId: ext.id,
                type: calc?.type || 'difference',
                value: calc?.value || 0,
                unit: calc?.unit || '',
                formatted: calc?.formatted || ''
            };
        });

        const updatedReport: Report = {
            ...report,
            motorNcsGroups: currentGroups,
            extractedValues: updatedExtracted,
            calculatedValues: updatedCalculated
        };

        setReport(updatedReport);
        ReportStorage.saveReport(updatedReport);
    };

    const handleValueChange = (extractedId: string, newValue: number) => {
        if (!report) return;

        const updatedExtracted = report.extractedValues.map(ext => {
            if (ext.id === extractedId) {
                return { ...ext, value: newValue, isCorrected: true };
            }
            return ext;
        });

        const updatedCalculated = updatedExtracted.map(ext => {
            const calc = calculateResult(ext.parameter, ext.value || 0, report.referenceValues);
            return {
                extractedId: ext.id,
                type: calc?.type || 'difference',
                value: calc?.value || 0,
                unit: calc?.unit || '',
                formatted: calc?.formatted || ''
            };
        });

        // Update motorNcsGroups if present
        let updatedGroups = report.motorNcsGroups;
        if (updatedGroups) {
            updatedGroups = updatedGroups.map(g => ({
                ...g,
                sites: g.sites.map(s => {
                    if (s.latencyValId === extractedId) return { ...s, latency: newValue };
                    if (s.amplitudeValId === extractedId) return { ...s, amplitude: newValue };
                    if (s.velocityValId === extractedId) return { ...s, velocity: newValue };
                    return s;
                })
            }));
        }

        const updatedReport = {
            ...report,
            extractedValues: updatedExtracted,
            calculatedValues: updatedCalculated,
            motorNcsGroups: updatedGroups
        };

        setReport(updatedReport);
        ReportStorage.saveReport(updatedReport);
    };

    const handleDownloadPDF = async () => {
        if (!report) return;
        setIsGeneratingPdf(true);
        try {
            const pdfBlob = await generateAnalyzedPDF(report);
            
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Analyzed_Motor_NCS_${report.fileName.replace(/\.[^/.]+$/, "")}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("PDF generation failed", error);
            alert("Failed to generate PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 font-medium text-slate-600">Loading analysis...</div>;
    if (!report) return <div className="p-8 text-red-500">Report not found.</div>;

    const latCount = report.extractedValues.filter(v => v.parameter.toLowerCase() === 'latency').length;
    const ampCount = report.extractedValues.filter(v => v.parameter.toLowerCase() === 'amplitude').length;
    const velCount = report.extractedValues.filter(v => v.parameter.toLowerCase() === 'velocity').length;

    const motorGroups: MotorNCSGroup[] = report.motorNcsGroups || getDefaultMotorNCSGroups();

    return (
        <div className="flex flex-col h-screen bg-slate-100/70">
            {/* Header */}
            <header className="no-print bg-white border-b border-slate-200 px-6 py-3.5 flex justify-between items-center shadow-xs z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/')} 
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            {report.fileName}
                            <span className="bg-emerald-100 text-emerald-800 text-[11px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                                Motor NCS Analyzed
                            </span>
                        </h2>
                        <p className="text-xs font-medium text-slate-500">
                            Processed: {new Date(report.uploadDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* View Switcher & Action Buttons */}
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80 text-xs font-bold">
                        <button
                            onClick={() => setViewMode('clinical')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                viewMode === 'clinical' 
                                    ? 'bg-white text-slate-900 shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <LayoutGrid size={14} />
                            Motor NCS Table
                        </button>
                        <button
                            onClick={() => setViewMode('itemized')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                viewMode === 'itemized' 
                                    ? 'bg-white text-slate-900 shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <List size={14} />
                            Parameter Cards
                        </button>
                    </div>

                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-white border border-slate-200 shadow-xs hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-semibold transition-all text-sm"
                    >
                        <Printer size={16} />
                        Print View
                    </button>
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold shadow-xs shadow-blue-500/20 transition-all disabled:opacity-70 text-sm"
                    >
                        {isGeneratingPdf ? 'Generating...' : (
                            <>
                                <Download size={16} />
                                Export PDF
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden p-5 gap-5 max-w-[1700px] mx-auto w-full">
                {/* Left Panel: Preview & Clinical Summary */}
                <div className="no-print w-[380px] flex flex-col gap-5 overflow-y-auto hidden xl:flex">
                    {/* Summary & Reference Baseline Card */}
                    <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                Clinical Baseline Settings
                            </h3>
                            <span className="text-[11px] font-semibold text-slate-400">NCS Thresholds</span>
                        </div>
                        
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 mb-4">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Latency</div>
                                    <div className="text-sm font-extrabold text-blue-700 mt-0.5">{report.referenceValues.latency} ms</div>
                                    <div className="text-[9px] text-slate-400 font-medium">Percentage</div>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Amplitude</div>
                                    <div className="text-sm font-extrabold text-emerald-700 mt-0.5">{report.referenceValues.amplitude} mV</div>
                                    <div className="text-[9px] text-slate-400 font-medium">Percentage</div>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Velocity</div>
                                    <div className="text-sm font-extrabold text-teal-700 mt-0.5">{report.referenceValues.velocity} m/s</div>
                                    <div className="text-[9px] text-slate-400 font-medium">Percentage</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
                                <div className="text-blue-600 font-bold">{latCount}</div>
                                <div className="text-[11px] text-blue-900 font-medium">Latency Sites</div>
                            </div>
                            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                                <div className="text-emerald-600 font-bold">{ampCount}</div>
                                <div className="text-[11px] text-emerald-900 font-medium">Amplitude Sites</div>
                            </div>
                            <div className="bg-teal-50/70 p-2.5 rounded-xl border border-teal-100">
                                <div className="text-teal-600 font-bold">{velCount}</div>
                                <div className="text-[11px] text-teal-900 font-medium">Velocity Segments</div>
                            </div>
                        </div>
                    </div>

                    {/* Source Document Preview with Orientation Controls */}
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 flex-1 flex flex-col overflow-hidden min-h-[420px]">
                        <div className="p-3.5 border-b border-slate-200 bg-slate-50/60 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FileText size={15} className="text-slate-500" />
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Source Document</span>
                            </div>
                            
                            {/* Rotation buttons */}
                            {previewUrl && report.fileType !== 'application/pdf' && (
                                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                                    <button 
                                        onClick={() => setPreviewRotation(r => (r - 90 + 360) % 360)}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors"
                                        title="Rotate 90° Counter-Clockwise"
                                    >
                                        <RotateCcw size={13} />
                                    </button>
                                    <span className="text-[10px] font-bold text-slate-500 px-1">{previewRotation}°</span>
                                    <button 
                                        onClick={() => setPreviewRotation(r => (r + 90) % 360)}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors"
                                        title="Rotate 90° Clockwise"
                                    >
                                        <RotateCw size={13} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 bg-slate-900/90 flex items-center justify-center overflow-auto relative p-2">
                            {previewUrl ? (
                                report.fileType === 'application/pdf' ? (
                                    <iframe 
                                        src={`${previewUrl}#toolbar=0&navpanes=0`} 
                                        className="w-full h-full bg-white rounded-lg shadow-inner"
                                        title="PDF Preview"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                        <img 
                                            src={previewUrl} 
                                            alt="Report Scan" 
                                            style={{ transform: `rotate(${previewRotation}deg)` }}
                                            className="max-w-full max-h-full object-contain transition-transform duration-300 rounded shadow-md" 
                                        />
                                    </div>
                                )
                            ) : (
                                <div className="text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
                                    <FileText size={28} className="opacity-40" />
                                    Preview not available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Motor NCS Clinical Report Table */}
                <div className="flex-1 bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col overflow-hidden print-area">
                    {viewMode === 'clinical' ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Hospital Official Header - Exactly matching original hospital format */}
                            <div className="px-6 py-4 border-b border-slate-200 bg-white">
                                <div className="flex justify-between items-start gap-4">
                                    {/* Hospital Logo on Left */}
                                    <div className="w-18 flex justify-start">
                                        <img 
                                            src={report.logoBase64 || '/hospital-logo.png'} 
                                            alt="Hospital Logo" 
                                            className="w-16 h-16 sm:w-18 sm:h-18 object-contain border border-slate-300 p-0.5 rounded shadow-2xs bg-white"
                                        />
                                    </div>

                                    {/* Hospital Headings Centered */}
                                    <div className="text-center flex-1">
                                        <h1 className="text-2xl sm:text-3xl font-black text-[#0c2369] tracking-tight uppercase">
                                            {report.hospitalName || 'K G HOSPITAL'}
                                        </h1>
                                        <h2 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-wider uppercase mt-0.5">
                                            {report.hospitalLocation || 'COIMBATORE'}
                                        </h2>
                                        <div className="text-xs sm:text-sm font-bold text-slate-700 mt-1">
                                            {report.labName || 'NeuroPhysiology Lab'}
                                        </div>
                                        <div className="text-xs sm:text-sm font-black text-slate-900 tracking-wide">
                                            {report.reportTitle || 'NCS/EP/EMG REPORTS'}
                                        </div>
                                    </div>

                                    {/* Right spacer for symmetry on desktop */}
                                    <div className="w-18 hidden sm:block"></div>
                                </div>

                                {/* Patient Details Grid Box */}
                                <div className="mt-4 border border-slate-300/80 rounded-xl p-3 bg-slate-50/70 text-xs">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1.5 gap-x-8">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-500">Full Name:</span>
                                            <span className="font-extrabold text-slate-900">{report.patientName || 'Mr.Dhandapani A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-500">Gender:</span>
                                            <span className="font-extrabold text-slate-900">{report.gender || 'Male'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-500">Patient ID:</span>
                                            <span className="font-mono font-bold text-slate-800">{report.patientId || '202511100114'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-500">Date of Birth:</span>
                                            <span className="font-medium text-slate-800">{report.dob || '01-07-1955'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-500">Visit Date:</span>
                                            <span className="font-medium text-slate-800">{report.visitDate || '28-09-2026 11:49'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-500">Age:</span>
                                            <span className="font-bold text-slate-800">{report.age || '71 Years'}</span>
                                        </div>
                                        <div className="flex items-center justify-between md:col-span-2 pt-1 border-t border-slate-200">
                                            <span className="font-bold text-slate-500">Referring Physician:</span>
                                            <span className="font-bold text-slate-900">{report.physician || 'Dr. TCR.Ramakrishnan MDDM(Neuro)'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section Bar */}
                                <div className="flex justify-between items-center mt-3 pt-1">
                                    <h3 className="text-base font-black text-slate-900 tracking-tight">Motor NCS</h3>
                                    <div className="text-[11px] font-bold text-blue-900 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200/80">
                                        Hospital Baselines: Latency {report.referenceValues.latency} ms | Amplitude {report.referenceValues.amplitude} mV | Velocity {report.referenceValues.velocity} m/s
                                    </div>
                                </div>
                            </div>

                            {/* Aligned 9-Column Medical Table */}
                            <div className="flex-1 overflow-auto bg-slate-50/20">
                                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                                    {/* 9 Clinical Table Columns */}
                                    <thead className="bg-slate-100 text-slate-800 font-extrabold sticky top-0 z-20 shadow-xs border-b border-slate-300">
                                        <tr className="divide-x divide-slate-300">
                                            <th className="px-3.5 py-3 w-[160px]">Nerve / Sites</th>
                                            <th className="px-3 py-3 w-[150px] bg-blue-50/40">
                                                <div>Latency</div>
                                                <div className="text-[10px] font-normal text-slate-500">ms</div>
                                            </th>
                                            <th className="px-3 py-3 w-[150px] bg-emerald-50/40">
                                                <div>Amplitude</div>
                                                <div className="text-[10px] font-normal text-slate-500">mV</div>
                                            </th>
                                            <th className="px-3 py-3 w-[90px]">
                                                <div>Duration</div>
                                                <div className="text-[10px] font-normal text-slate-500">ms</div>
                                            </th>
                                            <th className="px-3 py-3 w-[90px]">
                                                <div>Rel Amp</div>
                                                <div className="text-[10px] font-normal text-slate-500">%</div>
                                            </th>
                                            <th className="px-3.5 py-3 w-[180px]">Segments</th>
                                            <th className="px-3 py-3 w-[100px]">
                                                <div>Lat Diff</div>
                                                <div className="text-[10px] font-normal text-slate-500">ms</div>
                                            </th>
                                            <th className="px-3 py-3 w-[140px] bg-teal-50/40">
                                                <div>Velocity</div>
                                                <div className="text-[10px] font-normal text-slate-500">m/s</div>
                                            </th>
                                            <th className="px-3 py-3 w-[80px]">
                                                <div>Dist.</div>
                                                <div className="text-[10px] font-normal text-slate-500">mm</div>
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-300 bg-white">
                                        {motorGroups.map((group, gIdx) => {
                                            const nerveRef = getNerveReference(group.nerve || group.groupName, report.referenceValues);

                                            return (
                                                <Fragment key={group.groupName}>
                                                    {/* Group Header Row (e.g. R Median - APB) */}
                                                    <tr className="bg-slate-100/90 border-y border-slate-300">
                                                        <td colSpan={9} className="px-3.5 py-2 font-black text-slate-900 tracking-wide text-xs uppercase bg-slate-100 flex justify-between items-center">
                                                            <span>{group.groupName}</span>
                                                            <span className="text-[10px] font-semibold text-slate-500 normal-case">
                                                                Ref: Lat &lt; {nerveRef.latency} ms | Amp &gt; {nerveRef.amplitude} mV | NCV &gt; {nerveRef.velocity} m/s
                                                            </span>
                                                        </td>
                                                    </tr>

                                                    {/* Site Rows under Group */}
                                                    {group.sites.map((site, sIdx) => {
                                                        const isNR = site.latency === 'NR' || site.amplitude === 'NR';

                                                        // Latency Calculation (Percentage relative to nerve baseline)
                                                        let latPctStr: string | null = null;
                                                        if (typeof site.latency === 'number' && nerveRef.latency > 0) {
                                                            const pct = Math.round((site.latency / nerveRef.latency) * 1000) / 10;
                                                            latPctStr = `${pct}%`;
                                                        }

                                                        // Amplitude Calculation (Percentage relative to nerve baseline)
                                                        let ampPctStr: string | null = null;
                                                        if (typeof site.amplitude === 'number' && nerveRef.amplitude > 0) {
                                                            const pct = Math.round((site.amplitude / nerveRef.amplitude) * 1000) / 10;
                                                            ampPctStr = `${pct}%`;
                                                        }

                                                        // Velocity Calculation (Percentage relative to nerve baseline)
                                                        let velPctStr: string | null = null;
                                                        if (typeof site.velocity === 'number' && nerveRef.velocity > 0) {
                                                            const pct = Math.round((site.velocity / nerveRef.velocity) * 100);
                                                            velPctStr = `${pct}%`;
                                                        }

                                                    return (
                                                        <tr key={site.id} className="divide-x divide-slate-200 hover:bg-blue-50/20 transition-colors">
                                                            {/* Col 1: Site */}
                                                            <td className="px-3.5 py-2 font-bold text-slate-800">
                                                                {site.site}
                                                            </td>

                                                            {/* Col 2: Latency with Calculated % ALIGNED TO LEFT */}
                                                            <td className="px-2 py-1.5 bg-blue-50/15">
                                                                {isNR ? (
                                                                    <span className="font-bold text-slate-400 px-2">NR</span>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5">
                                                                        {latPctStr !== null && (
                                                                            <span 
                                                                                className="font-black text-[10px] px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap bg-blue-100 text-blue-800 border border-blue-200"
                                                                                title={`(${site.latency} / ${report.referenceValues.latency}) × 100 = ${latPctStr}`}
                                                                            >
                                                                                ({latPctStr})
                                                                            </span>
                                                                        )}
                                                                        <input 
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={site.latency !== null && site.latency !== undefined ? site.latency : ''}
                                                                            onChange={(e) => handleMotorSiteChange(gIdx, sIdx, 'latency', e.target.value)}
                                                                            className="w-16 px-1.5 py-1 text-xs font-bold text-slate-800 border border-slate-300 rounded focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Col 3: Amplitude with Calculated % ALIGNED TO LEFT */}
                                                            <td className="px-2 py-1.5 bg-emerald-50/15">
                                                                {isNR ? (
                                                                    <span className="font-bold text-slate-400 px-2">NR</span>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5">
                                                                        {ampPctStr !== null && (
                                                                            <span 
                                                                                className="font-black text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap"
                                                                                title={`(${site.amplitude} / ${report.referenceValues.amplitude}) × 100 = ${ampPctStr}`}
                                                                            >
                                                                                ({ampPctStr})
                                                                            </span>
                                                                        )}
                                                                        <input 
                                                                            type="number"
                                                                            step="0.1"
                                                                            value={site.amplitude !== null && site.amplitude !== undefined ? site.amplitude : ''}
                                                                            onChange={(e) => handleMotorSiteChange(gIdx, sIdx, 'amplitude', e.target.value)}
                                                                            className="w-14 px-1.5 py-1 text-xs font-bold text-slate-800 border border-slate-300 rounded focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Col 4: Duration */}
                                                            <td className="px-2 py-1.5">
                                                                {isNR ? (
                                                                    <span className="font-bold text-slate-400 px-2">NR</span>
                                                                ) : (
                                                                    <input 
                                                                        type="text"
                                                                        value={site.duration !== null && site.duration !== undefined ? site.duration : ''}
                                                                        onChange={(e) => handleMotorSiteChange(gIdx, sIdx, 'duration', e.target.value)}
                                                                        className="w-14 px-1.5 py-1 text-xs font-medium text-slate-700 border border-transparent hover:border-slate-300 focus:border-slate-400 focus:bg-white rounded outline-none"
                                                                    />
                                                                )}
                                                            </td>

                                                            {/* Col 5: Rel Amp */}
                                                            <td className="px-2 py-1.5">
                                                                {isNR ? (
                                                                    <span className="font-bold text-slate-400 px-2">NR</span>
                                                                ) : (
                                                                    <input 
                                                                        type="text"
                                                                        value={site.relAmp !== null && site.relAmp !== undefined ? site.relAmp : ''}
                                                                        onChange={(e) => handleMotorSiteChange(gIdx, sIdx, 'relAmp', e.target.value)}
                                                                        className="w-14 px-1.5 py-1 text-xs font-medium text-slate-700 border border-transparent hover:border-slate-300 focus:border-slate-400 focus:bg-white rounded outline-none"
                                                                    />
                                                                )}
                                                            </td>

                                                            {/* Col 6: Segments */}
                                                            <td className="px-3 py-1.5 font-medium text-slate-700">
                                                                {site.segment || '-'}
                                                            </td>

                                                            {/* Col 7: Lat Diff */}
                                                            <td className="px-2 py-1.5">
                                                                {site.latDiff === 'NR' ? (
                                                                    <span className="font-bold text-slate-400 px-2">NR</span>
                                                                ) : site.latDiff !== null && site.latDiff !== undefined ? (
                                                                    <span className="font-semibold text-slate-700 px-2">{site.latDiff}</span>
                                                                ) : (
                                                                    <span className="text-slate-300 px-2">-</span>
                                                                )}
                                                            </td>

                                                            {/* Col 8: Velocity with Calculated % ALIGNED TO LEFT */}
                                                            <td className="px-2 py-1.5 bg-teal-50/15">
                                                                {site.velocity === 'NR' ? (
                                                                    <span className="font-bold text-slate-400 px-2">NR</span>
                                                                ) : site.velocity !== null && site.velocity !== undefined ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        {velPctStr !== null && (
                                                                            <span 
                                                                                className="font-black text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200 shadow-2xs whitespace-nowrap"
                                                                                title={`(${site.velocity} / ${report.referenceValues.velocity}) × 100 = ${velPctStr}`}
                                                                            >
                                                                                ({velPctStr})
                                                                            </span>
                                                                        )}
                                                                        <input 
                                                                            type="number"
                                                                            step="1"
                                                                            value={site.velocity}
                                                                            onChange={(e) => handleMotorSiteChange(gIdx, sIdx, 'velocity', e.target.value)}
                                                                            className="w-14 px-1.5 py-1 text-xs font-bold text-slate-800 border border-slate-300 rounded focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300 px-2">-</span>
                                                                )}
                                                            </td>

                                                            {/* Col 9: Dist */}
                                                            <td className="px-2 py-1.5">
                                                                {site.distance !== null && site.distance !== undefined ? (
                                                                    <span className="font-semibold text-slate-700 px-2">{site.distance}</span>
                                                                ) : (
                                                                    <span className="text-slate-300 px-2">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </Fragment>
                                        );
                                    })}
                                    </tbody>
                                </table>
                                <div className="py-3 px-4 bg-white border-t border-slate-200 text-center text-xs text-slate-500 font-semibold tracking-wide">
                                    1 of {report.totalPages || 3} • NeuroPhysiology Lab Clinical NCS Report
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Itemized Parameter Breakdown List View */
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 bg-white">
                                <h3 className="font-extrabold text-base text-slate-800">Itemized Clinical Parameter List</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Edit individual values. Calculations update instantaneously.</p>
                            </div>
                            
                            <div className="flex-1 overflow-auto p-4">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-widest font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Nerve / Site</th>
                                            <th className="px-4 py-3">Parameter</th>
                                            <th className="px-4 py-3">Reference Baseline</th>
                                            <th className="px-4 py-3 bg-blue-50/50">Reported Value</th>
                                            <th className="px-4 py-3 bg-blue-50/30">Calculated Difference / %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {report.extractedValues.map(ext => {
                                            const calc = report.calculatedValues.find(c => c.extractedId === ext.id);
                                            let refValue = 0;
                                            const paramLower = ext.parameter.toLowerCase();
                                            if (paramLower === 'latency') refValue = report.referenceValues.latency;
                                            if (paramLower === 'amplitude') refValue = report.referenceValues.amplitude;
                                            if (paramLower === 'velocity') refValue = report.referenceValues.velocity;

                                            const isDiff = calc?.type === 'difference';

                                            return (
                                                <tr key={ext.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-800">{ext.nerve}</div>
                                                        <div className="text-[11px] text-slate-400 font-medium">{ext.side} • {ext.site}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                            paramLower === 'latency' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                            paramLower === 'amplitude' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                            'bg-teal-50 text-teal-700 border border-teal-200'
                                                        }`}>
                                                            {ext.parameter}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-slate-500">
                                                        {refValue} {ext.unit}
                                                    </td>
                                                    <td className="px-4 py-3 bg-blue-50/10">
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="number"
                                                                step="0.01"
                                                                value={ext.value || ''}
                                                                onChange={(e) => handleValueChange(ext.id, parseFloat(e.target.value))}
                                                                className="w-20 px-2 py-1 border border-slate-300 rounded font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                            />
                                                            <span className="text-[11px] font-bold text-slate-400">{ext.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 bg-slate-50/30">
                                                        <span className={`px-2.5 py-1 rounded font-black text-xs ${
                                                            isDiff ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                                                        }`}>
                                                            ({calc?.formatted})
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

