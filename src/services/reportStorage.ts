import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Report, ReferenceValues } from '../types/report';

const DB_NAME = 'neuro_analyzer_db';
const STORE_NAME = 'reports';

interface NeuroDB extends DBSchema {
    reports: {
        key: string;
        value: Report;
        indexes: { 'uploadDate': string };
    };
}

let dbPromise: Promise<IDBPDatabase<NeuroDB>>;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<NeuroDB>(DB_NAME, 1, {
            upgrade(db) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('uploadDate', 'uploadDate');
            },
        });
    }
    return dbPromise;
}

const memoryStore = new Map<string, Report>();
const META_KEY = 'neuro_reports_meta_v1';

function saveMetaToLocalStorage(report: Report) {
    try {
        const existing = localStorage.getItem(META_KEY);
        const list: any[] = existing ? JSON.parse(existing) : [];
        // Save report without heavy binary fileData to prevent quota errors
        const { fileData, ...meta } = report;
        const filtered = list.filter((r: any) => r.id !== report.id);
        filtered.push(meta);
        localStorage.setItem(META_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.warn("Could not save report meta to localStorage:", e);
    }
}

function getMetaFromLocalStorage(id?: string): Report[] {
    try {
        const existing = localStorage.getItem(META_KEY);
        if (!existing) return [];
        const list: Report[] = JSON.parse(existing);
        return id ? list.filter(r => r.id === id) : list;
    } catch (e) {
        return [];
    }
}

export const ReportStorage = {
    async getAllReports(): Promise<Report[]> {
        const reportsMap = new Map<string, Report>();

        // 1. Load from localStorage metadata
        const localMetas = getMetaFromLocalStorage();
        localMetas.forEach(r => reportsMap.set(r.id, r));

        // 2. Load from memory store
        memoryStore.forEach((r, k) => reportsMap.set(k, r));

        // 3. Attempt IndexedDB
        try {
            const db = await getDB();
            const dbReports = await db.getAllFromIndex(STORE_NAME, 'uploadDate');
            if (dbReports && dbReports.length > 0) {
                dbReports.forEach(r => {
                    reportsMap.set(r.id, r);
                    memoryStore.set(r.id, r);
                });
            }
        } catch (e) {
            console.warn("IndexedDB getAllReports unavailable, using memory/local store:", e);
        }

        return Array.from(reportsMap.values());
    },

    async getReport(id: string): Promise<Report | undefined> {
        // 1. Fast check memory
        if (memoryStore.has(id)) {
            return memoryStore.get(id);
        }

        // 2. Try IndexedDB
        try {
            const db = await getDB();
            const report = await db.get(STORE_NAME, id);
            if (report) {
                memoryStore.set(id, report);
                return report;
            }
        } catch (e) {
            console.warn("IndexedDB getReport unavailable, checking fallbacks:", e);
        }

        // 3. Fallback to localStorage metadata
        const local = getMetaFromLocalStorage(id);
        if (local.length > 0) {
            memoryStore.set(id, local[0]);
            return local[0];
        }

        return undefined;
    },

    async saveReport(report: Report): Promise<void> {
        // 1. Always keep in fast memory
        memoryStore.set(report.id, report);
        
        // 2. Always persist metadata to localStorage
        saveMetaToLocalStorage(report);

        // 3. Attempt IndexedDB persistence with graceful degradation
        try {
            const db = await getDB();
            await db.put(STORE_NAME, report);
        } catch (dbErr) {
            console.warn("IndexedDB full save failed, retrying without binary fileData:", dbErr);
            try {
                const { fileData, ...reportWithoutBinary } = report;
                const db = await getDB();
                await db.put(STORE_NAME, reportWithoutBinary as any);
            } catch (fallbackErr) {
                console.warn("IndexedDB storage unavailable, saved in memory & local storage:", fallbackErr);
            }
        }
    },

    async deleteReport(id: string): Promise<void> {
        memoryStore.delete(id);
        try {
            const existing = getMetaFromLocalStorage();
            localStorage.setItem(META_KEY, JSON.stringify(existing.filter(r => r.id !== id)));
        } catch (e) {}

        try {
            const db = await getDB();
            await db.delete(STORE_NAME, id);
        } catch (e) {
            console.warn("IndexedDB delete failed:", e);
        }
    },

    async clearAllReports(): Promise<void> {
        memoryStore.clear();
        try {
            localStorage.removeItem(META_KEY);
        } catch (e) {}

        try {
            const db = await getDB();
            await db.clear(STORE_NAME);
        } catch (e) {
            console.warn("IndexedDB clear failed:", e);
        }
    }
};

const DEFAULT_REFERENCES: ReferenceValues = {
    latency: 4.4,
    amplitude: 4.5,
    velocity: 50
};

export const SettingsStorage = {
    getReferences(): ReferenceValues {
        const saved = localStorage.getItem('hospitalReferences');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        return DEFAULT_REFERENCES;
    },

    saveReferences(refs: ReferenceValues): void {
        localStorage.setItem('hospitalReferences', JSON.stringify(refs));
    },

    resetReferences(): void {
        localStorage.removeItem('hospitalReferences');
    }
};
