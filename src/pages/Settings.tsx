import { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { SettingsStorage } from '../services/reportStorage';
import type { ReferenceValues } from '../types/report';

export default function Settings() {
    const [refs, setRefs] = useState<ReferenceValues>({ latency: 0, amplitude: 0, velocity: 0 });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setRefs(SettingsStorage.getReferences());
    }, []);

    const handleChange = (key: keyof ReferenceValues, value: number) => {
        setRefs(prev => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        SettingsStorage.saveReferences(refs);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleReset = () => {
        SettingsStorage.resetReferences();
        setRefs(SettingsStorage.getReferences());
        setSaved(false);
    };

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800">Hospital Reference Settings</h2>
                <p className="text-slate-500 mt-2">Configure default reference values used for calculations. Changes will apply to newly uploaded reports.</p>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-medium text-slate-800">Reference Values</h3>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Latency</label>
                            <div className="flex items-center">
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={refs.latency}
                                    onChange={(e) => handleChange('latency', parseFloat(e.target.value) || 0)}
                                    className="w-full border border-slate-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="bg-slate-100 border border-l-0 border-slate-300 text-slate-500 px-4 py-2 rounded-r-lg">ms</span>
                            </div>
                            <p className="text-xs text-slate-500">Calculates percentage: (Actual / Reference) × 100</p>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Amplitude</label>
                            <div className="flex items-center">
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={refs.amplitude}
                                    onChange={(e) => handleChange('amplitude', parseFloat(e.target.value) || 0)}
                                    className="w-full border border-slate-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="bg-slate-100 border border-l-0 border-slate-300 text-slate-500 px-4 py-2 rounded-r-lg">mV</span>
                            </div>
                            <p className="text-xs text-slate-500">Calculates percentage: (Actual / Reference) × 100</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Velocity</label>
                            <div className="flex items-center">
                                <input 
                                    type="number" 
                                    step="1"
                                    value={refs.velocity}
                                    onChange={(e) => handleChange('velocity', parseFloat(e.target.value) || 0)}
                                    className="w-full border border-slate-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="bg-slate-100 border border-l-0 border-slate-300 text-slate-500 px-4 py-2 rounded-r-lg">m/s</span>
                            </div>
                            <p className="text-xs text-slate-500">Calculates percentage: (Actual / Reference) × 100</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-center">
                    <button 
                        onClick={handleReset}
                        className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-2"
                    >
                        <RefreshCw size={18} />
                        Reset to Defaults
                    </button>
                    
                    <div className="flex items-center gap-4">
                        {saved && <span className="text-green-600 text-sm font-medium">Settings saved successfully</span>}
                        <button 
                            onClick={handleSave}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Save size={18} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

            {/* Official KG Hospital Reference Guide */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">KG Hospital Department of Neurology - EMG Reference Chart</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Nerve-specific clinical baseline values and abnormality thresholds.</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                        NCS Neurophysiology
                    </span>
                </div>

                <div className="overflow-x-auto p-6">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Motor NCS Protocol</h4>
                    <table className="w-full text-left text-xs border-collapse border border-slate-200 mb-6">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-2.5 border-r border-slate-200">Nerve</th>
                                <th className="p-2.5 border-r border-slate-200">Onset Lat</th>
                                <th className="p-2.5 border-r border-slate-200 text-blue-700">&gt;125%</th>
                                <th className="p-2.5 border-r border-slate-200 text-blue-900">&gt;150%</th>
                                <th className="p-2.5 border-r border-slate-200">AMP (mV)</th>
                                <th className="p-2.5 border-r border-slate-200 text-emerald-800">&lt;80%</th>
                                <th className="p-2.5 border-r border-slate-200">NCV (m/s)</th>
                                <th className="p-2.5 border-r border-slate-200 text-teal-700">&lt;80%</th>
                                <th className="p-2.5 border-r border-slate-200 text-teal-900">&lt;70%</th>
                                <th className="p-2.5 border-r border-slate-200">Dist (cm)</th>
                                <th className="p-2.5">F-Wave</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                            <tr className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">Median</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&lt; 4.2 ms</td>
                                <td className="p-2.5 border-r border-slate-200 text-blue-700">&gt; 5.25</td>
                                <td className="p-2.5 border-r border-slate-200 text-blue-900 font-bold">&gt; 6.3</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&gt; 4.4 mV</td>
                                <td className="p-2.5 border-r border-slate-200 text-emerald-800 font-bold">&lt; 3.52</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&gt; 49 m/s</td>
                                <td className="p-2.5 border-r border-slate-200 text-teal-700">&lt; 39.2</td>
                                <td className="p-2.5 border-r border-slate-200 text-teal-900 font-bold">&lt; 34.3</td>
                                <td className="p-2.5 border-r border-slate-200">6-8</td>
                                <td className="p-2.5">&lt; 31 ms</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">Ulnar</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&lt; 3.4 ms</td>
                                <td className="p-2.5 border-r border-slate-200 text-blue-700">&gt; 4.25</td>
                                <td className="p-2.5 border-r border-slate-200 text-blue-900 font-bold">&gt; 5.1</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&gt; 6.0 mV</td>
                                <td className="p-2.5 border-r border-slate-200 text-emerald-800 font-bold">&lt; 4.8</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&gt; 49 m/s</td>
                                <td className="p-2.5 border-r border-slate-200 text-teal-700">&lt; 39.2</td>
                                <td className="p-2.5 border-r border-slate-200 text-teal-900 font-bold">&lt; 34.3</td>
                                <td className="p-2.5 border-r border-slate-200">5.5-7.5</td>
                                <td className="p-2.5">&lt; 32 ms</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">Radial</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&lt; 5.2 ms</td>
                                <td className="p-2.5 border-r border-slate-200 text-blue-700">&gt; 6.5</td>
                                <td className="p-2.5 border-r border-slate-200 text-blue-900 font-bold">&gt; 7.8</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&gt; 4.0 mV</td>
                                <td className="p-2.5 border-r border-slate-200 text-emerald-800 font-bold">&lt; 3.2</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&gt; 50 m/s</td>
                                <td className="p-2.5 border-r border-slate-200 text-teal-700">&lt; 40.0</td>
                                <td className="p-2.5 border-r border-slate-200 text-teal-900 font-bold">&lt; 35.0</td>
                                <td className="p-2.5 border-r border-slate-200">10</td>
                                <td className="p-2.5">-</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">Peroneal</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&lt; 5.8 ms</td>
                                <td className="p-2.5 border-r border-slate-200 text-blue-700">&gt; 7.25</td>
                                <td className="p-2.5 border-r border-slate-200 text-blue-900 font-bold">&gt; 8.7</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&gt; 2.0 mV</td>
                                <td className="p-2.5 border-r border-slate-200 text-emerald-800 font-bold">&lt; 1.6</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&gt; 42 m/s</td>
                                <td className="p-2.5 border-r border-slate-200 text-teal-700">&lt; 33.6</td>
                                <td className="p-2.5 border-r border-slate-200 text-teal-900 font-bold">&lt; 29.4</td>
                                <td className="p-2.5 border-r border-slate-200">6-11</td>
                                <td className="p-2.5">&lt; 58 ms</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">Tibial</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&lt; 6.5 ms</td>
                                <td className="p-2.5 border-r border-slate-200 text-blue-700">&gt; 8.1</td>
                                <td className="p-2.5 border-r border-slate-200 text-blue-900 font-bold">&gt; 9.75</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&gt; 3.0 mV</td>
                                <td className="p-2.5 border-r border-slate-200 text-emerald-800 font-bold">&lt; 2.4</td>
                                <td className="p-2.5 border-r border-slate-200 text-slate-900 font-bold">&gt; 41 m/s</td>
                                <td className="p-2.5 border-r border-slate-200 text-teal-700">&lt; 32.8</td>
                                <td className="p-2.5 border-r border-slate-200 text-teal-900 font-bold">&lt; 28.7</td>
                                <td className="p-2.5 border-r border-slate-200">6-8</td>
                                <td className="p-2.5">&lt; 59 ms</td>
                            </tr>
                        </tbody>
                    </table>

                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Sensory NCS (SCNS) Protocol</h4>
                    <table className="w-full text-left text-xs border-collapse border border-slate-200">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-2.5 border-r border-slate-200">Nerve</th>
                                <th className="p-2.5 border-r border-slate-200">Recording Site</th>
                                <th className="p-2.5 border-r border-slate-200">Onset Lat</th>
                                <th className="p-2.5 border-r border-slate-200">Peak Lat</th>
                                <th className="p-2.5 border-r border-slate-200">Amp (μV)</th>
                                <th className="p-2.5 border-r border-slate-200">NCV (m/s)</th>
                                <th className="p-2.5">Dist (cm)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                            <tr className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">Median</td>
                                <td className="p-2.5 border-r border-slate-200">Digit 2</td>
                                <td className="p-2.5 border-r border-slate-200">&lt; 2.5 ms</td>
                                <td className="p-2.5 border-r border-slate-200">&lt; 3.5 ms</td>
                                <td className="p-2.5 border-r border-slate-200">&gt; 20 μV</td>
                                <td className="p-2.5 border-r border-slate-200">&gt; 52 m/s</td>
                                <td className="p-2.5">13 cm</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">Ulnar</td>
                                <td className="p-2.5 border-r border-slate-200">Digit 5</td>
                                <td className="p-2.5 border-r border-slate-200">&lt; 2.1 ms</td>
                                <td className="p-2.5 border-r border-slate-200">&lt; 3.0 ms</td>
                                <td className="p-2.5 border-r border-slate-200">&gt; 15 μV</td>
                                <td className="p-2.5 border-r border-slate-200">&gt; 52 m/s</td>
                                <td className="p-2.5">11 cm</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">Radial</td>
                                <td className="p-2.5 border-r border-slate-200">Wrist</td>
                                <td className="p-2.5 border-r border-slate-200">&lt; 1.9 ms</td>
                                <td className="p-2.5 border-r border-slate-200">&lt; 2.8 ms</td>
                                <td className="p-2.5 border-r border-slate-200">&gt; 20 μV</td>
                                <td className="p-2.5 border-r border-slate-200">&gt; 48 m/s</td>
                                <td className="p-2.5">10 cm</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">Sural</td>
                                <td className="p-2.5 border-r border-slate-200">Ankle / Calf</td>
                                <td className="p-2.5 border-r border-slate-200">&lt; 3.2 ms</td>
                                <td className="p-2.5 border-r border-slate-200">&lt; 4.4 ms</td>
                                <td className="p-2.5 border-r border-slate-200">&gt; 6 μV</td>
                                <td className="p-2.5 border-r border-slate-200">&gt; 42 m/s</td>
                                <td className="p-2.5">14 cm</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold border-r border-slate-200">Superficial Peroneal</td>
                                <td className="p-2.5 border-r border-slate-200">Ankle / Lat Leg</td>
                                <td className="p-2.5 border-r border-slate-200">&lt; 4.4 ms</td>
                                <td className="p-2.5 border-r border-slate-200">-</td>
                                <td className="p-2.5 border-r border-slate-200">&gt; 6 μV</td>
                                <td className="p-2.5 border-r border-slate-200">&gt; 40 m/s</td>
                                <td className="p-2.5">140 mm</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
