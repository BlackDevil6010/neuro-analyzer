export interface ReferenceValues {
    latency: number;
    amplitude: number;
    velocity: number;
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
    coordinates?: {
        pageIndex: number;
        x: number;
        y: number;
        width?: number;
    };
}

export interface MotorNCSSiteData {
    id: string;
    site: string;
    latencyValId?: string;
    latency: number | string | null;
    amplitudeValId?: string;
    amplitude: number | string | null;
    duration: number | string | null;
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
    analysisStatus: 'pending' | 'completed' | 'error';
    fileData?: ArrayBuffer;
    fileType?: string;
}


