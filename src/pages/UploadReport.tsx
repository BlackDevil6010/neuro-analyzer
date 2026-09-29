import React, { useState, useRef } from 'react';
import { Upload, File, Loader2, FileUp, Sparkles, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { extractReportData as extractValuesFromFile } from '../services/extractionService';
import { ReportStorage, SettingsStorage } from '../services/reportStorage';
import { calculateResult, computeAnnotationCoordinates } from '../utils/calculations';
import type { Report, CalculatedValue } from '../types/report';

export default function UploadReport() {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (selectedFile: File) => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (validTypes.includes(selectedFile.type)) {
            setFile(selectedFile);
        } else {
            alert("Unsupported file type. Please upload a PDF, JPG, or PNG.");
        }
    };

    const processFile = async () => {
        if (!file) return;
        
        setIsProcessing(true);
        setStatus('Initializing local OCR engine...');
        
        try {
            const { 
                values: extractedValues, 
                groups: motorNcsGroups, 
                fWaveRows,
                physician, 
                patientName, 
                patientId, 
                gender,
                dob,
                age, 
                visitDate,
                hospitalName,
                hospitalLocation,
                labName,
                reportTitle,
                logoBase64,
                totalPages
            } = await extractValuesFromFile(file);
            
            setStatus('Computing clinical differences...');
            const referenceValues = SettingsStorage.getReferences();
            
            // Map baseline duration for each nerve (first valid duration = baseline)
            const baselineDurationByNerve = new Map<string, number>();
            for (const ext of extractedValues) {
                if (ext.parameter.toLowerCase() === 'duration' && ext.value !== null && !isNaN(ext.value)) {
                    if (!baselineDurationByNerve.has(ext.nerve)) {
                        baselineDurationByNerve.set(ext.nerve, ext.value);
                    }
                }
            }

            const rawCalculated: CalculatedValue[] = extractedValues.map(ext => {
                const isDuration = ext.parameter.toLowerCase() === 'duration';
                const baseline = isDuration ? baselineDurationByNerve.get(ext.nerve) : undefined;
                const calc = calculateResult(ext.parameter, ext.value || 0, referenceValues, ext.nerve, baseline);
                return {
                    extractedId: ext.id,
                    type: calc?.type || 'difference',
                    value: calc?.value || 0,
                    unit: calc?.unit || '',
                    formatted: calc?.formatted || '',
                    diffPctFormatted: calc?.diffPctFormatted,
                    equivPctFormatted: calc?.equivPctFormatted,
                    isAbnormal: calc?.isAbnormal
                };
            });
            const calculatedValues = computeAnnotationCoordinates(extractedValues, rawCalculated);
            
            setStatus('Finalizing report layout...');
            let fileData: ArrayBuffer | undefined = undefined;
            try {
                fileData = await file.arrayBuffer();
            } catch (bufErr) {
                console.warn("Could not read file arrayBuffer:", bufErr);
            }
            
            const newReport: Report = {
                id: `report_${Date.now()}`,
                fileName: file.name,
                fileSize: file.size,
                uploadDate: new Date().toISOString(),
                physician: physician || 'Dr. TCR.Ramakrishnan MDDM(Neuro)',
                patientName: patientName || 'Mr.Dhandapani A',
                patientId: patientId || '202511100114',
                gender: gender || 'Male',
                dob: dob || '01-07-1955',
                age: age || '71 Years',
                visitDate: visitDate || '28-09-2026 11:49',
                hospitalName: hospitalName || 'K G HOSPITAL',
                hospitalLocation: hospitalLocation || 'COIMBATORE',
                labName: labName || 'NeuroPhysiology Lab',
                reportTitle: reportTitle || 'NCS/EP/EMG REPORTS',
                logoBase64: logoBase64 || '/hospital-logo.png',
                totalPages: totalPages || 3,
                referenceValues,
                extractedValues,
                calculatedValues,
                motorNcsGroups,
                fWaveRows,
                analysisStatus: 'completed',
                fileData,
                fileType: file.type
            };
            
            try {
                await ReportStorage.saveReport(newReport);
            } catch (saveErr) {
                console.warn("ReportStorage save warning:", saveErr);
            }
            navigate(`/analysis/${newReport.id}`);
            
        } catch (error) {
            console.error("Error processing file:", error);
            alert("An error occurred while processing the file: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsProcessing(false);
            setStatus('');
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 h-full flex flex-col justify-center pb-20">
            <header className="mb-12 text-center relative z-10">
                <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white mb-6 shadow-xl shadow-indigo-500/30 ring-4 ring-indigo-500/10 transform hover:scale-105 transition-transform duration-300">
                    <FileUp size={32} strokeWidth={2.5} />
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">Secure Local Analysis</h2>
                <p className="text-slate-500 mt-4 text-base font-medium max-w-lg mx-auto leading-relaxed">
                    Upload your NCS/EMG PDF or Image. Data is extracted and analyzed instantly inside your browser. No cloud uploads.
                </p>
            </header>

            <div className="bg-white/60 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-white p-2 relative overflow-hidden z-10 group/card">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div 
                    className={`relative border-2 border-dashed rounded-[1.75rem] p-12 md:p-16 text-center transition-all duration-500 ease-out overflow-hidden bg-white/40 ${
                        isDragging 
                            ? 'border-indigo-500 bg-indigo-50/80 scale-[0.99] shadow-[inset_0_0_40px_rgba(99,102,241,0.1)]' 
                            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80 cursor-pointer'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isDragging && (
                        <div className="absolute inset-0 bg-indigo-400 blur-[100px] opacity-20 animate-pulse pointer-events-none" />
                    )}

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                    />
                    
                    <div className="relative z-10 flex flex-col items-center pointer-events-none">
                        <div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 ${
                            isDragging 
                                ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xl shadow-indigo-600/30 scale-110 -translate-y-2' 
                                : 'bg-slate-100/80 text-indigo-500 shadow-sm group-hover/card:bg-indigo-50 group-hover/card:text-indigo-600 group-hover/card:scale-110'
                        }`}>
                            <Upload size={40} strokeWidth={2.5} className={isDragging ? 'animate-bounce' : ''} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Drop your clinical report here</h3>
                        <p className="text-slate-500 mb-8 font-medium flex items-center justify-center gap-2">
                            <span>Supported formats: PDF, JPG, PNG</span>
                        </p>
                        
                        <button className="bg-white border-2 border-slate-200/80 text-slate-700 px-8 py-3.5 rounded-2xl font-bold shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-lg hover:border-indigo-200 hover:text-indigo-600 transition-all duration-300 pointer-events-auto">
                            Browse Local Files
                        </button>
                    </div>
                </div>

                {file && (
                    <div className="mt-4 bg-white rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-blue-500" />
                        <div className="flex items-center gap-4 px-4 w-full md:w-auto mb-4 md:mb-0">
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3.5 rounded-xl text-indigo-600 shadow-inner border border-indigo-100/50">
                                <File size={28} strokeWidth={2.5} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-slate-800 line-clamp-1">{file.name}</p>
                                <p className="text-sm font-semibold text-slate-500 mt-0.5 tracking-wide uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                            </div>
                        </div>
                        <div className="w-full md:w-auto px-4 pb-2 md:pb-0">
                            <button 
                                onClick={(e) => { e.stopPropagation(); processFile(); }}
                                disabled={isProcessing}
                                className="w-full md:w-auto bg-slate-900 hover:bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:shadow-indigo-500/40 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} strokeWidth={3} />
                                        <span>{status}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Extract Data</span>
                                        <Sparkles size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-sm font-medium relative z-10">
                <AlertCircle size={16} />
                <span>Confidential: Files never leave your device. All processing occurs locally.</span>
            </div>
        </div>
    );
}
