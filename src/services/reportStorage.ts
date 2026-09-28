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

export const ReportStorage = {
    async getAllReports(): Promise<Report[]> {
        const db = await getDB();
        return db.getAllFromIndex(STORE_NAME, 'uploadDate');
    },

    async getReport(id: string): Promise<Report | undefined> {
        const db = await getDB();
        return db.get(STORE_NAME, id);
    },

    async saveReport(report: Report): Promise<void> {
        const db = await getDB();
        await db.put(STORE_NAME, report);
    },

    async deleteReport(id: string): Promise<void> {
        const db = await getDB();
        await db.delete(STORE_NAME, id);
    },

    async clearAllReports(): Promise<void> {
        const db = await getDB();
        await db.clear(STORE_NAME);
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
