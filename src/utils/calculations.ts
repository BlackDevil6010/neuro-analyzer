import type { ReferenceValues } from '../types/report';

export interface NerveReferenceValues {
    latency: number;
    amplitude: number;
    velocity: number;
    distCms?: string;
    fWave?: number;
    lat125?: number;
    lat150?: number;
    amp80?: number;
    ncv80?: number;
    ncv70?: number;
}

// Official KG Hospital Department of Neurology EMG / NCS Neurophysiology Reference Values
export const KG_HOSPITAL_MOTOR_REFERENCES: Record<string, NerveReferenceValues> = {
    median: {
        latency: 4.2,      // Onset Lat < 4.2 ms
        lat125: 5.25,     // > 125% = > 5.25
        lat150: 6.3,      // > 150% = > 6.3
        amplitude: 4.4,    // AMP > 4.4 mV
        amp80: 3.52,      // < 80% = < 3.52
        velocity: 49,     // NCV > 49 m/s
        ncv80: 39.2,      // < 80% = < 39.2
        ncv70: 34.3,      // < 70% = < 34.3
        distCms: '6-8',   // Dist: 6-8 cm
        fWave: 31         // F-wave: < 31 ms (>120%: >37.2, >150%: >46.5)
    },
    ulnar: {
        latency: 3.4,      // Onset Lat < 3.4 ms
        lat125: 4.25,     // > 125% = > 4.25
        lat150: 5.1,      // > 150% = > 5.1
        amplitude: 6.0,    // AMP > 6.0 mV
        amp80: 4.8,       // < 80% = < 4.8
        velocity: 49,     // NCV > 49 m/s
        ncv80: 39.2,      // < 80% = < 39.2
        ncv70: 34.3,      // < 70% = < 34.3
        distCms: '5.5-7.5',// Dist: 5.5-7.5 cm
        fWave: 32         // F-wave: < 32 ms (>120%: >38.4, >150%: >48)
    },
    radial: {
        latency: 5.2,      // Onset Lat < 5.2 ms
        lat125: 6.5,      // > 125% = > 6.5
        lat150: 7.8,      // > 150% = > 7.8
        amplitude: 4.0,    // AMP > 4.0 mV
        amp80: 3.2,       // < 80% = < 3.2
        velocity: 50,     // NCV > 50 m/s
        ncv80: 40.0,      // < 80% = < 40
        ncv70: 35.0,      // < 70% = < 35
        distCms: '10'     // Dist: 10 cm
    },
    peroneal: {
        latency: 5.8,      // Onset Lat < 5.8 ms
        lat125: 7.25,     // > 125% = > 7.25
        lat150: 8.7,      // > 150% = > 8.7
        amplitude: 2.0,    // AMP > 2.0 mV
        amp80: 1.6,       // < 80% = < 1.6
        velocity: 42,     // NCV > 42 m/s
        ncv80: 33.6,      // < 80% = < 33.6
        ncv70: 29.4,      // < 70% = < 29.4
        distCms: '6-11',  // Dist: 6-11 cm
        fWave: 58         // F-wave: < 58 ms (>120%: >69.6, >150%: >87)
    },
    tibial: {
        latency: 6.5,      // Onset Lat < 6.5 ms
        lat125: 8.1,      // > 125% = > 8.1
        lat150: 9.75,     // > 150% = > 9.75
        amplitude: 3.0,    // AMP > 3.0 mV
        amp80: 2.4,       // < 80% = < 2.4
        velocity: 41,     // NCV > 41 m/s
        ncv80: 32.8,      // < 80% = < 32.8
        ncv70: 28.7,      // < 70% = < 28.7
        distCms: '6-8',   // Dist: 6-8 cm
        fWave: 59         // F-wave: < 59 ms (>120%: >70.8, >150%: >88.5)
    }
};

export const KG_HOSPITAL_SENSORY_REFERENCES = {
    median: { onsetLat: 2.5, peakLat: 3.5, amp: 20, velocity: 52, distCm: 13 },
    ulnar: { onsetLat: 2.1, peakLat: 3.0, amp: 15, velocity: 52, distCm: 11 },
    radial: { onsetLat: 1.9, peakLat: 2.8, amp: 20, velocity: 48, distCm: 10 },
    sural: { onsetLat: 3.2, peakLat: 4.4, amp: 6, velocity: 42, distCm: 14 },
    superficial_peroneal: { onsetLat: 4.4, amp: 6, velocity: 40, distCm: 140 }
};

export function getNerveReference(nerve?: string, fallbackRefs?: ReferenceValues): NerveReferenceValues {
    if (nerve) {
        const n = nerve.toLowerCase();
        if (n.includes('median')) return KG_HOSPITAL_MOTOR_REFERENCES.median;
        if (n.includes('ulnar')) return KG_HOSPITAL_MOTOR_REFERENCES.ulnar;
        if (n.includes('radial')) return KG_HOSPITAL_MOTOR_REFERENCES.radial;
        if (n.includes('peroneal') || n.includes('fibular')) return KG_HOSPITAL_MOTOR_REFERENCES.peroneal;
        if (n.includes('tibial')) return KG_HOSPITAL_MOTOR_REFERENCES.tibial;
    }
    return {
        latency: fallbackRefs?.latency || 4.2,
        amplitude: fallbackRefs?.amplitude || 4.4,
        velocity: fallbackRefs?.velocity || 49
    };
}

export function calculateResult(
    parameter: string, 
    actualValue: number, 
    referenceValues?: ReferenceValues,
    nerve?: string
): { type: 'difference' | 'percentage'; value: number; unit: string; formatted: string; isAbnormal?: boolean } | null {
    if (typeof actualValue !== 'number' || isNaN(actualValue)) {
        return null;
    }

    const ref = getNerveReference(nerve, referenceValues);
    const param = parameter.toLowerCase();

    if (param === 'latency') {
        if (!ref.latency || ref.latency <= 0) return null;
        const perc = (actualValue / ref.latency) * 100;
        const rounded = Math.round(perc * 10) / 10;
        return {
            type: 'percentage',
            value: rounded,
            unit: '%',
            formatted: `${rounded}%`,
            isAbnormal: rounded > 125
        };
    }

    if (param === 'amplitude') {
        if (!ref.amplitude || ref.amplitude <= 0) return null;
        const perc = (actualValue / ref.amplitude) * 100;
        const rounded = Math.round(perc * 10) / 10;
        return {
            type: 'percentage',
            value: rounded,
            unit: '%',
            formatted: `${rounded}%`,
            isAbnormal: rounded < 80
        };
    }

    if (param === 'velocity') {
        if (!ref.velocity || ref.velocity <= 0) return null;
        const perc = (actualValue / ref.velocity) * 100;
        const rounded = Math.round(perc);
        return {
            type: 'percentage',
            value: rounded,
            unit: '%',
            formatted: `${rounded}%`,
            isAbnormal: rounded < 80
        };
    }

    return null;
}
