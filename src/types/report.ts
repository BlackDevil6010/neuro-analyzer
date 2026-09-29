export interface ReferenceValues {
    latency: number;
    amplitude: number;
    velocity: number;
}

export interface PDFCoordinates {
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ExtractedValue {
    id: string;
    nerve: string;
    side: string;
    site: string;
    parameter: 'Latency' | 'Amplitude' | 'Velocity' | string;
    value: number | null;
    unit: string;
    isCorrected?: boolean;
    coordinates?: PDFCoordinates;
}

export interface DurationAnalysis {
    isBaseline: boolean;
    baselineValue?: number;
    diff?: number;
    diffFormatted?: string;       // e.g. "+1.94 ms" or "-0.34 ms"
    diffPct?: number;
    diffPctFormatted?: string;    // e.g. "+38.65%" or "-7.66%"
    hasEquivalent: boolean;       // diffPct > 30
    equivPct?: number;
    equivPctFormatted?: string;   // e.g. "138.65%"
}

export interface MotorNCSSiteData {
    id: string;
    site: string;
    latencyValId?: string;
    latency: number | string | null;
    amplitudeValId?: string;
    amplitude: number | string | null;
    durationValId?: string;
    duration: number | string | null;
    durationAnalysis?: DurationAnalysis;
    relAmp: number | string | null;
    segment: string;
    latDiff: number | string | null;
    velocityValId?: string;
    velocity: number | string | null;
    distance: number | string | null;
}

export interface MotorNCSGroup {
    groupName: string; // e.g. "R Median - APB"
    nerve: string;
    side: string;
    muscle: string;
    sites: MotorNCSSiteData[];
}

export interface CalculatedValue {
    extractedId: string;
    type: 'difference' | 'percentage';
    value: number;
    unit: string;
    formatted: string;
    diffPctFormatted?: string;
    equivPctFormatted?: string;
    coordinates?: PDFCoordinates;
    isAbnormal?: boolean;
}

export interface FWaveRow {
    nerve: string;
    fLat: number | null;
    mLat: number | null;
    fMinusMLat: number | null;
    minMLat: number | null;
    refValue?: number;
    pct?: number;
    diff?: number;
    isProlonged?: boolean;
}

export interface Report {
    id: string;
    fileName: string;
    fileSize?: number;
    uploadDate: string;
    physician?: string;
    patientName?: string;
    patientId?: string;
    gender?: string;
    dob?: string;
    age?: string;
    visitDate?: string;
    hospitalName?: string;
    hospitalLocation?: string;
    labName?: string;
    reportTitle?: string;
    logoBase64?: string;
    totalPages?: number;
    referenceValues: ReferenceValues;
    extractedValues: ExtractedValue[];
    calculatedValues: CalculatedValue[];
    motorNcsGroups?: MotorNCSGroup[];
    fWaveRows?: FWaveRow[];
    analysisStatus: 'pending' | 'completed' | 'error';
    fileData?: ArrayBuffer;
    fileType?: string;
}


