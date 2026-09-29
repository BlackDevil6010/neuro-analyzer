import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Report, MotorNCSGroup, FWaveRow } from '../types/report';
import { getDefaultMotorNCSGroups, getDefaultFWaveRows } from './extractionService';
import { DEFAULT_LOGO_RAW_BASE64 } from '../assets/logoBase64';
import { getNerveReference } from '../utils/calculations';

function base64ToUint8Array(base64: string): Uint8Array {
    const raw = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export async function generateAnalyzedPDF(report: Report): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const totalPagesStr = report.totalPages ? `${report.totalPages}` : '3';

    // Try embedding logo
    let embeddedLogo: any = null;
    try {
        if (report.logoBase64 && report.logoBase64.startsWith('data:image')) {
            const logoBytes = base64ToUint8Array(report.logoBase64);
            embeddedLogo = await pdfDoc.embedPng(logoBytes);
        } else {
            try {
                const res = await fetch('/hospital-logo.png');
                if (res.ok) {
                    const arrayBuf = await res.arrayBuffer();
                    embeddedLogo = await pdfDoc.embedPng(arrayBuf);
                }
            } catch {
                // Ignore fetch error, use fallback base64
            }
            if (!embeddedLogo) {
                const logoBytes = base64ToUint8Array(DEFAULT_LOGO_RAW_BASE64);
                embeddedLogo = await pdfDoc.embedPng(logoBytes);
            }
        }
    } catch (e) {
        console.warn("Could not embed logo image in PDF", e);
    }

    // Standard A4 dimensions (595.44 x 841.92 pt)
    const pageWidth = 595.44;
    const pageHeight = 841.92;

    // Geometric alignment grid
    const startX = 50;
    const tableWidth = 495;
    const endX = startX + tableWidth; // 545

    const drawCenterPage = (targetPage: any, text: string, y: number, size: number, f: any, color?: any) => {
        const textWidth = f.widthOfTextAtSize(text, size);
        targetPage.drawText(text, {
            x: (pageWidth - textWidth) / 2,
            y,
            size,
            font: f,
            color: color || rgb(0, 0, 0)
        });
    };

    const drawRight = (targetPage: any, text: string, rightX: number, y: number, size: number, f: any, color?: any) => {
        const textWidth = f.widthOfTextAtSize(text, size);
        targetPage.drawText(text, {
            x: rightX - textWidth,
            y,
            size,
            font: f,
            color: color || rgb(0, 0, 0)
        });
    };

    const drawColCenter = (targetPage: any, text: string, colLeft: number, colW: number, y: number, size: number, f: any, color?: any) => {
        const textWidth = f.widthOfTextAtSize(text, size);
        targetPage.drawText(text, {
            x: colLeft + (colW - textWidth) / 2,
            y,
            size,
            font: f,
            color: color || rgb(0, 0, 0)
        });
    };

    const drawHeaderAndPatientInfo = (targetPage: any, curTopY: number = 766): number => {
        const hospitalName = report.hospitalName || "K G HOSPITAL";
        const location = report.hospitalLocation || "COIMBATORE";
        const labName = report.labName || "NeuroPhysiology Lab";
        const reportTitle = report.reportTitle || "NCS/EP/EMG REPORTS";

        drawCenterPage(targetPage, hospitalName, curTopY, 20, fontBold, rgb(0.06, 0.16, 0.44));
        drawCenterPage(targetPage, location, curTopY - 18, 13, fontBold, rgb(0.15, 0.15, 0.15));
        drawCenterPage(targetPage, labName, curTopY - 38, 10.5, fontBold, rgb(0.2, 0.2, 0.2));
        drawCenterPage(targetPage, reportTitle, curTopY - 52, 10.5, fontBold, rgb(0.2, 0.2, 0.2));

        // Logo on Left side, perfectly aligned with left margin (startX = 50)
        const logoSize = 56;
        const logoX = startX;
        const logoY = curTopY - 42;
        if (embeddedLogo) {
            targetPage.drawImage(embeddedLogo, {
                x: logoX,
                y: logoY,
                width: logoSize,
                height: logoSize
            });
            targetPage.drawRectangle({
                x: logoX - 0.5,
                y: logoY - 0.5,
                width: logoSize + 1,
                height: logoSize + 1,
                borderColor: rgb(0.7, 0.75, 0.8),
                borderWidth: 0.5
            });
        }

        // Patient Information Card (aligned with startX = 50, width = 495)
        const infoY = curTopY - 68;
        const infoBoxHeight = 72;
        targetPage.drawRectangle({
            x: startX,
            y: infoY - infoBoxHeight,
            width: tableWidth,
            height: infoBoxHeight,
            color: rgb(0.985, 0.99, 0.995),
            borderColor: rgb(0.75, 0.8, 0.85),
            borderWidth: 0.5
        });

        const c1LabelX = startX + 10;
        const c1ValX = startX + 105;
        const c2LabelX = startX + 300;
        const c2ValX = startX + 375;
        const labelColor = rgb(0.35, 0.4, 0.45);
        const valColor = rgb(0.05, 0.05, 0.1);
        const infoSize = 8.5;

        let lineY = infoY - 14;
        // Row 1: Full Name / Gender
        targetPage.drawText("Full Name:", { x: c1LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
        targetPage.drawText(report.patientName || "Mr.Dhandapani A", { x: c1ValX, y: lineY, size: infoSize, font: fontBold, color: valColor });
        targetPage.drawText("Gender:", { x: c2LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
        targetPage.drawText(report.gender || "Male", { x: c2ValX, y: lineY, size: infoSize, font, color: valColor });

        // Row 2: Patient ID / Date of Birth
        lineY -= 14;
        targetPage.drawText("Patient ID:", { x: c1LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
        targetPage.drawText(report.patientId || "202511100114", { x: c1ValX, y: lineY, size: infoSize, font, color: valColor });
        targetPage.drawText("Date of Birth:", { x: c2LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
        targetPage.drawText(report.dob || "01-07-1955", { x: c2ValX, y: lineY, size: infoSize, font, color: valColor });

        // Row 3: Visit Date / Age
        lineY -= 14;
        targetPage.drawText("Visit Date:", { x: c1LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
        targetPage.drawText(report.visitDate || "28-09-2026 11:49", { x: c1ValX, y: lineY, size: infoSize, font, color: valColor });
        targetPage.drawText("Age:", { x: c2LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
        targetPage.drawText(report.age || "71 Years", { x: c2ValX, y: lineY, size: infoSize, font, color: valColor });

        // Row 4: Referring Physician
        lineY -= 14;
        targetPage.drawText("Referring Physician:", { x: c1LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
        targetPage.drawText(report.physician || "Dr.TCR.Ramakrishnan MDDM(Neuro)", { x: c1ValX, y: lineY, size: infoSize, font, color: valColor });

        return infoY - infoBoxHeight;
    };

    // Load original source PDF if present
    let srcDoc: PDFDocument | null = null;
    if (report.fileData && (report.fileType === 'application/pdf' || report.fileName.toLowerCase().endsWith('.pdf'))) {
        try {
            const bufferCopy = new Uint8Array(report.fileData.slice(0));
            srcDoc = await PDFDocument.load(bufferCopy, { ignoreEncryption: true });
        } catch (srcErr) {
            console.warn("Could not load original PDF for copying pages:", srcErr);
        }
    }

    // ==========================================
    // PAGE 1: ANALYZED MOTOR NCS REPORT
    // ==========================================
    const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
    let curY = drawHeaderAndPatientInfo(page1, 766);

    // Section Title Bar
    curY -= 16;
    page1.drawText("Motor NCS", {
        x: startX,
        y: curY,
        size: 11,
        font: fontBold,
        color: rgb(0.08, 0.12, 0.2)
    });

    const baselineNote = "KG Hospital Protocol: Median Lat <4.2 | Ulnar <3.4 | Peroneal <5.8 | Tibial <6.5";
    drawRight(page1, baselineNote, endX, curY, 7.5, fontBold, rgb(0.2, 0.38, 0.65));

    curY -= 8;

    // 9-Column Medical Table Setup (Total = 495 pt)
    const colWidths = [76, 62, 58, 36, 36, 96, 42, 51, 38];
    const colHeaders = [
        { title: 'Nerve / Sites', unit: '' },
        { title: 'Latency', unit: 'ms' },
        { title: 'Amplitude', unit: 'mV' },
        { title: 'Duration', unit: 'ms' },
        { title: 'Rel Amp', unit: '%' },
        { title: 'Segments', unit: '' },
        { title: 'Lat Diff', unit: 'ms' },
        { title: 'Velocity', unit: 'm/s' },
        { title: 'Dist.', unit: 'mm' }
    ];

    const headerH = 22;
    let currentPage = page1;

    const drawTableHeader = (targetPage: any, y: number) => {
        targetPage.drawRectangle({
            x: startX,
            y: y - headerH,
            width: tableWidth,
            height: headerH,
            color: rgb(0.93, 0.95, 0.98),
            borderColor: rgb(0.35, 0.4, 0.45),
            borderWidth: 0.75
        });

        let xCursor = startX;
        colHeaders.forEach((col, idx) => {
            const colW = colWidths[idx];
            if (col.unit) {
                drawColCenter(targetPage, col.title, xCursor, colW, y - 9.5, 7.5, fontBold, rgb(0.1, 0.15, 0.2));
                drawColCenter(targetPage, col.unit, xCursor, colW, y - 18, 6.5, font, rgb(0.35, 0.4, 0.45));
            } else {
                if (idx === 0) {
                    targetPage.drawText(col.title, { x: xCursor + 6, y: y - 14, size: 7.5, font: fontBold, color: rgb(0.1, 0.15, 0.2) });
                } else {
                    drawColCenter(targetPage, col.title, xCursor, colW, y - 14, 7.5, fontBold, rgb(0.1, 0.15, 0.2));
                }
            }
            xCursor += colW;
            if (idx < colWidths.length - 1) {
                targetPage.drawLine({
                    start: { x: xCursor, y },
                    end: { x: xCursor, y: y - headerH },
                    thickness: 0.5,
                    color: rgb(0.7, 0.75, 0.8)
                });
            }
        });
    };

    drawTableHeader(currentPage, curY);
    curY -= headerH;

    const rowH = 14;
    const groupH = 15;

    const ensureSpace = (neededHeight: number) => {
        if (curY - neededHeight < 45) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            curY = 800;
            drawTableHeader(currentPage, curY);
            curY -= headerH;
        }
    };

    const groups: MotorNCSGroup[] = report.motorNcsGroups || getDefaultMotorNCSGroups();

    for (const grp of groups) {
        ensureSpace(groupH + rowH);

        const nerveRef = getNerveReference(grp.nerve || grp.groupName, report.referenceValues);

        // Group Header Row
        currentPage.drawRectangle({
            x: startX,
            y: curY - groupH,
            width: tableWidth,
            height: groupH,
            color: rgb(0.96, 0.97, 0.99),
            borderColor: rgb(0.5, 0.55, 0.6),
            borderWidth: 0.5
        });

        currentPage.drawText(grp.groupName, {
            x: startX + 6,
            y: curY - 11,
            size: 8,
            font: fontBold,
            color: rgb(0.1, 0.15, 0.25)
        });

        const refText = `KG Ref: Lat < ${nerveRef.latency} ms | Amp > ${nerveRef.amplitude} mV | NCV > ${nerveRef.velocity} m/s`;
        drawRight(currentPage, refText, endX - 6, curY - 11, 6.5, font, rgb(0.35, 0.4, 0.45));

        curY -= groupH;

        for (const s of grp.sites) {
            ensureSpace(rowH);

            currentPage.drawRectangle({
                x: startX,
                y: curY - rowH,
                width: tableWidth,
                height: rowH,
                borderColor: rgb(0.75, 0.8, 0.85),
                borderWidth: 0.5
            });

            // Vertical column dividers
            let divX = startX;
            colWidths.forEach((w, idx) => {
                divX += w;
                if (idx < colWidths.length - 1) {
                    currentPage.drawLine({
                        start: { x: divX, y: curY },
                        end: { x: divX, y: curY - rowH },
                        thickness: 0.5,
                        color: rgb(0.8, 0.85, 0.9)
                    });
                }
            });

            // Col 0: Site (Left-aligned)
            currentPage.drawText(s.site, { x: startX + 6, y: curY - 10, size: 7.5, font: fontBold, color: rgb(0.2, 0.25, 0.3) });

            // Col 1: Latency (Percentage on Left, Numeric Value Right-aligned)
            let cLeft = startX + colWidths[0];
            let cRight = cLeft + colWidths[1];
            if (s.latency === 'NR' || s.latency === null || s.latency === undefined) {
                drawColCenter(currentPage, s.latency === 'NR' ? 'NR' : '-', cLeft, colWidths[1], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            } else {
                const val = typeof s.latency === 'number' ? s.latency : parseFloat(s.latency as string);
                const pct = Math.round((val / nerveRef.latency) * 1000) / 10;
                currentPage.drawText(`(${pct}%)`, { x: cLeft + 3, y: curY - 10, size: 6, font: fontBold, color: rgb(0.05, 0.35, 0.8) });
                drawRight(currentPage, val.toFixed(2), cRight - 4, curY - 10, 7.5, font, rgb(0, 0, 0));
            }

            // Col 2: Amplitude (Percentage on Left, Numeric Value Right-aligned)
            cLeft = cRight;
            cRight = cLeft + colWidths[2];
            if (s.amplitude === 'NR' || s.amplitude === null || s.amplitude === undefined) {
                drawColCenter(currentPage, s.amplitude === 'NR' ? 'NR' : '-', cLeft, colWidths[2], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            } else {
                const val = typeof s.amplitude === 'number' ? s.amplitude : parseFloat(s.amplitude as string);
                const pct = Math.round((val / nerveRef.amplitude) * 1000) / 10;
                currentPage.drawText(`(${pct}%)`, { x: cLeft + 3, y: curY - 10, size: 6, font: fontBold, color: rgb(0.05, 0.5, 0.2) });
                drawRight(currentPage, val.toFixed(1), cRight - 4, curY - 10, 7.5, font, rgb(0, 0, 0));
            }

            // Col 3: Duration (Right-aligned)
            cLeft = cRight;
            cRight = cLeft + colWidths[3];
            if (s.duration === 'NR') {
                drawColCenter(currentPage, 'NR', cLeft, colWidths[3], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            } else if (s.duration !== null && s.duration !== undefined) {
                drawRight(currentPage, `${s.duration}`, cRight - 4, curY - 10, 7.5, font, rgb(0.2, 0.2, 0.2));
            } else {
                drawColCenter(currentPage, '-', cLeft, colWidths[3], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            }

            // Col 4: Rel Amp (Right-aligned, or centered if NR)
            cLeft = cRight;
            cRight = cLeft + colWidths[4];
            if (s.relAmp === 'NR') {
                drawColCenter(currentPage, 'NR', cLeft, colWidths[4], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            } else if (s.relAmp !== null && s.relAmp !== undefined) {
                drawRight(currentPage, `${s.relAmp}`, cRight - 4, curY - 10, 7.5, font, rgb(0.2, 0.2, 0.2));
            } else {
                drawColCenter(currentPage, '-', cLeft, colWidths[4], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            }

            // Col 5: Segments (Left-aligned)
            cLeft = cRight;
            cRight = cLeft + colWidths[5];
            currentPage.drawText(s.segment || '-', { x: cLeft + 4, y: curY - 10, size: 6.5, font, color: rgb(0.2, 0.25, 0.3) });

            // Col 6: Lat Diff (Right-aligned, or centered if NR)
            cLeft = cRight;
            cRight = cLeft + colWidths[6];
            if (s.latDiff === 'NR') {
                drawColCenter(currentPage, 'NR', cLeft, colWidths[6], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            } else if (s.latDiff !== null && s.latDiff !== undefined) {
                drawRight(currentPage, `${s.latDiff}`, cRight - 4, curY - 10, 7.5, font, rgb(0.2, 0.2, 0.2));
            } else {
                drawColCenter(currentPage, '-', cLeft, colWidths[6], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            }

            // Col 7: Velocity (Percentage on Left, Numeric Value Right-aligned)
            cLeft = cRight;
            cRight = cLeft + colWidths[7];
            if (s.velocity === 'NR' || s.velocity === null || s.velocity === undefined) {
                drawColCenter(currentPage, s.velocity === 'NR' ? 'NR' : '-', cLeft, colWidths[7], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            } else {
                const val = typeof s.velocity === 'number' ? s.velocity : parseFloat(s.velocity as string);
                const pct = Math.round((val / nerveRef.velocity) * 100);
                currentPage.drawText(`(${pct}%)`, { x: cLeft + 3, y: curY - 10, size: 6, font: fontBold, color: rgb(0.0, 0.5, 0.5) });
                drawRight(currentPage, `${val}`, cRight - 4, curY - 10, 7.5, font, rgb(0, 0, 0));
            }

            // Col 8: Dist (Right-aligned)
            cLeft = cRight;
            cRight = cLeft + colWidths[8];
            if (s.distance !== null && s.distance !== undefined) {
                drawRight(currentPage, `${s.distance}`, cRight - 4, curY - 10, 7.5, font, rgb(0.2, 0.2, 0.2));
            } else {
                drawColCenter(currentPage, '-', cLeft, colWidths[8], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            }

            curY -= rowH;
        }
    }

    // Page 1 Footer: "1 of 3"
    drawCenterPage(page1, `1 of ${totalPagesStr}`, 35, 9, font, rgb(0.3, 0.35, 0.4));

    // ==========================================
    // PAGE 2: SENSORY NCS (Copied or Generated)
    // ==========================================
    if (srcDoc && srcDoc.getPageCount() > 1) {
        try {
            const [copiedPage2] = await pdfDoc.copyPages(srcDoc, [1]);
            pdfDoc.addPage(copiedPage2);
        } catch (p2Err) {
            console.warn("Could not copy page 2:", p2Err);
        }
    }

    // ==========================================
    // PAGE 3: F WAVE STUDY (Analyzed Table & Waveforms)
    // ==========================================
    const fWaveList: FWaveRow[] = (report.fWaveRows && report.fWaveRows.length > 0)
        ? report.fWaveRows
        : getDefaultFWaveRows();

    // 7-Column F-Wave Table layout (width = 495 pt)
    const fColWidths = [105, 60, 45, 50, 50, 65, 120];
    const fColHeaders = [
        { title: 'Nerve', unit: '' },
        { title: 'F Lat', unit: 'ms' },
        { title: 'M Lat', unit: 'ms' },
        { title: 'F-M Lat', unit: 'ms' },
        { title: 'Min M Lat', unit: 'ms' },
        { title: 'KG Ref', unit: 'ms' },
        { title: 'Interpretation', unit: '' }
    ];

    if (srcDoc && srcDoc.getPageCount() >= 3) {
        try {
            // Copy original Page 3 so that waveform electrical graphs below remain authentic
            const [copiedPage3] = await pdfDoc.copyPages(srcDoc, [2]);
            pdfDoc.addPage(copiedPage3);

            // Clean white card covering the unanalyzed table region (Y: 295 to 425)
            const fTableTopY = 412;
            const fCardHeight = 120;
            copiedPage3.drawRectangle({
                x: startX - 2,
                y: fTableTopY - fCardHeight,
                width: tableWidth + 4,
                height: fCardHeight + 18,
                color: rgb(1, 1, 1),
                borderColor: rgb(1, 1, 1),
                borderWidth: 0
            });

            // Section Header Bar
            copiedPage3.drawText("F Wave study", {
                x: startX,
                y: fTableTopY + 4,
                size: 10.5,
                font: fontBold,
                color: rgb(0.08, 0.12, 0.2)
            });

            const fBaselineText = "KG Hospital Protocol: Median <31 ms | Ulnar <32 ms | Peroneal <58 ms | Tibial <59 ms";
            drawRight(copiedPage3, fBaselineText, endX, fTableTopY + 4, 7.5, fontBold, rgb(0.2, 0.38, 0.65));

            // F-Wave Table Header
            const fHeaderH = 20;
            let fCurY = fTableTopY - 4;
            copiedPage3.drawRectangle({
                x: startX,
                y: fCurY - fHeaderH,
                width: tableWidth,
                height: fHeaderH,
                color: rgb(0.93, 0.95, 0.98),
                borderColor: rgb(0.35, 0.4, 0.45),
                borderWidth: 0.75
            });

            let fXCursor = startX;
            fColHeaders.forEach((col, idx) => {
                const colW = fColWidths[idx];
                if (col.unit) {
                    drawColCenter(copiedPage3, col.title, fXCursor, colW, fCurY - 8.5, 7.5, fontBold, rgb(0.1, 0.15, 0.2));
                    drawColCenter(copiedPage3, col.unit, fXCursor, colW, fCurY - 16, 6.5, font, rgb(0.35, 0.4, 0.45));
                } else {
                    if (idx === 0) {
                        copiedPage3.drawText(col.title, { x: fXCursor + 6, y: fCurY - 13, size: 7.5, font: fontBold, color: rgb(0.1, 0.15, 0.2) });
                    } else {
                        drawColCenter(copiedPage3, col.title, fXCursor, colW, fCurY - 13, 7.5, fontBold, rgb(0.1, 0.15, 0.2));
                    }
                }
                fXCursor += colW;
                if (idx < fColWidths.length - 1) {
                    copiedPage3.drawLine({
                        start: { x: fXCursor, y: fCurY },
                        end: { x: fXCursor, y: fCurY - fHeaderH },
                        thickness: 0.5,
                        color: rgb(0.7, 0.75, 0.8)
                    });
                }
            });

            fCurY -= fHeaderH;
            const fRowH = 13.5;

            // Render Analyzed F-Wave Data Rows
            for (const fRow of fWaveList) {
                copiedPage3.drawRectangle({
                    x: startX,
                    y: fCurY - fRowH,
                    width: tableWidth,
                    height: fRowH,
                    borderColor: rgb(0.75, 0.8, 0.85),
                    borderWidth: 0.5
                });

                // Vertical dividers
                let fDivX = startX;
                fColWidths.forEach((w, idx) => {
                    fDivX += w;
                    if (idx < fColWidths.length - 1) {
                        copiedPage3.drawLine({
                            start: { x: fDivX, y: fCurY },
                            end: { x: fDivX, y: fCurY - fRowH },
                            thickness: 0.5,
                            color: rgb(0.8, 0.85, 0.9)
                        });
                    }
                });

                // Col 0: Nerve
                copiedPage3.drawText(fRow.nerve, { x: startX + 6, y: fCurY - 9.5, size: 7.5, font: fontBold, color: rgb(0.15, 0.2, 0.25) });

                // Col 1: F Lat (with percentage badge on left, numeric value on right)
                let fcLeft = startX + fColWidths[0];
                let fcRight = fcLeft + fColWidths[1];
                if (fRow.fLat !== null && fRow.fLat !== undefined) {
                    const pctVal = fRow.pct ?? Math.round((fRow.fLat / (fRow.refValue || 31)) * 1000) / 10;
                    const pctColor = fRow.isProlonged ? rgb(0.85, 0.15, 0.1) : rgb(0.05, 0.35, 0.8);
                    copiedPage3.drawText(`(${pctVal}%)`, { x: fcLeft + 3, y: fCurY - 9.5, size: 6, font: fontBold, color: pctColor });
                    drawRight(copiedPage3, fRow.fLat.toFixed(1), fcRight - 4, fCurY - 9.5, 7.5, font, rgb(0, 0, 0));
                } else {
                    drawColCenter(copiedPage3, '-', fcLeft, fColWidths[1], fCurY - 9.5, 7.5, font, rgb(0.5, 0.5, 0.5));
                }

                // Col 2: M Lat
                fcLeft = fcRight;
                fcRight = fcLeft + fColWidths[2];
                if (fRow.mLat !== null && fRow.mLat !== undefined) {
                    drawRight(copiedPage3, fRow.mLat.toFixed(1), fcRight - 5, fCurY - 9.5, 7.5, font, rgb(0.2, 0.2, 0.2));
                } else {
                    drawColCenter(copiedPage3, '-', fcLeft, fColWidths[2], fCurY - 9.5, 7.5, font, rgb(0.5, 0.5, 0.5));
                }

                // Col 3: F-M Lat
                fcLeft = fcRight;
                fcRight = fcLeft + fColWidths[3];
                if (fRow.fMinusMLat !== null && fRow.fMinusMLat !== undefined) {
                    drawRight(copiedPage3, fRow.fMinusMLat.toFixed(1), fcRight - 5, fCurY - 9.5, 7.5, font, rgb(0.2, 0.2, 0.2));
                } else {
                    drawColCenter(copiedPage3, '-', fcLeft, fColWidths[3], fCurY - 9.5, 7.5, font, rgb(0.5, 0.5, 0.5));
                }

                // Col 4: Min M Lat
                fcLeft = fcRight;
                fcRight = fcLeft + fColWidths[4];
                if (fRow.minMLat !== null && fRow.minMLat !== undefined) {
                    drawRight(copiedPage3, fRow.minMLat.toFixed(1), fcRight - 5, fCurY - 9.5, 7.5, font, rgb(0.2, 0.2, 0.2));
                } else {
                    drawColCenter(copiedPage3, '-', fcLeft, fColWidths[4], fCurY - 9.5, 7.5, font, rgb(0.5, 0.5, 0.5));
                }

                // Col 5: KG Ref
                fcLeft = fcRight;
                fcRight = fcLeft + fColWidths[5];
                const refStr = `< ${fRow.refValue || 31} ms`;
                drawColCenter(copiedPage3, refStr, fcLeft, fColWidths[5], fCurY - 9.5, 7, font, rgb(0.35, 0.4, 0.45));

                // Col 6: Interpretation
                fcLeft = fcRight;
                fcRight = fcLeft + fColWidths[6];
                if (fRow.isProlonged) {
                    const diffStr = fRow.diff !== undefined ? `+${fRow.diff} ms` : `prolonged`;
                    const interpText = `Prolonged (${diffStr})`;
                    copiedPage3.drawText(interpText, { x: fcLeft + 4, y: fCurY - 9.5, size: 6.5, font: fontBold, color: rgb(0.85, 0.15, 0.1) });
                } else {
                    copiedPage3.drawText("Normal", { x: fcLeft + 4, y: fCurY - 9.5, size: 6.5, font: fontBold, color: rgb(0.05, 0.5, 0.2) });
                }

                fCurY -= fRowH;
            }
        } catch (fWaveErr) {
            console.warn("Could not overlay F-Wave study on Page 3:", fWaveErr);
        }
    } else {
        // Fallback standalone Page 3 if source PDF is missing or single page
        const page3 = pdfDoc.addPage([pageWidth, pageHeight]);
        let p3Y = drawHeaderAndPatientInfo(page3, 766);

        p3Y -= 16;
        page3.drawText("F Wave study", {
            x: startX,
            y: p3Y,
            size: 11,
            font: fontBold,
            color: rgb(0.08, 0.12, 0.2)
        });

        const fBaselineText = "KG Hospital Protocol: Median <31 ms | Ulnar <32 ms | Peroneal <58 ms | Tibial <59 ms";
        drawRight(page3, fBaselineText, endX, p3Y, 7.5, fontBold, rgb(0.2, 0.38, 0.65));

        p3Y -= 8;
        const fHeaderH = 22;
        page3.drawRectangle({
            x: startX,
            y: p3Y - fHeaderH,
            width: tableWidth,
            height: fHeaderH,
            color: rgb(0.93, 0.95, 0.98),
            borderColor: rgb(0.35, 0.4, 0.45),
            borderWidth: 0.75
        });

        let fXCursor = startX;
        fColHeaders.forEach((col, idx) => {
            const colW = fColWidths[idx];
            if (col.unit) {
                drawColCenter(page3, col.title, fXCursor, colW, p3Y - 9.5, 7.5, fontBold, rgb(0.1, 0.15, 0.2));
                drawColCenter(page3, col.unit, fXCursor, colW, p3Y - 18, 6.5, font, rgb(0.35, 0.4, 0.45));
            } else {
                if (idx === 0) {
                    page3.drawText(col.title, { x: fXCursor + 6, y: p3Y - 14, size: 7.5, font: fontBold, color: rgb(0.1, 0.15, 0.2) });
                } else {
                    drawColCenter(page3, col.title, fXCursor, colW, p3Y - 14, 7.5, fontBold, rgb(0.1, 0.15, 0.2));
                }
            }
            fXCursor += colW;
            if (idx < fColWidths.length - 1) {
                page3.drawLine({
                    start: { x: fXCursor, y: p3Y },
                    end: { x: fXCursor, y: p3Y - fHeaderH },
                    thickness: 0.5,
                    color: rgb(0.7, 0.75, 0.8)
                });
            }
        });

        p3Y -= fHeaderH;
        const fRowH = 16;

        for (const fRow of fWaveList) {
            page3.drawRectangle({
                x: startX,
                y: p3Y - fRowH,
                width: tableWidth,
                height: fRowH,
                borderColor: rgb(0.75, 0.8, 0.85),
                borderWidth: 0.5
            });

            // Col 0: Nerve
            page3.drawText(fRow.nerve, { x: startX + 6, y: p3Y - 11, size: 7.5, font: fontBold, color: rgb(0.15, 0.2, 0.25) });

            // Col 1: F Lat
            let fcLeft = startX + fColWidths[0];
            let fcRight = fcLeft + fColWidths[1];
            if (fRow.fLat !== null && fRow.fLat !== undefined) {
                const pctVal = fRow.pct ?? Math.round((fRow.fLat / (fRow.refValue || 31)) * 1000) / 10;
                const pctColor = fRow.isProlonged ? rgb(0.85, 0.15, 0.1) : rgb(0.05, 0.35, 0.8);
                page3.drawText(`(${pctVal}%)`, { x: fcLeft + 3, y: p3Y - 11, size: 6, font: fontBold, color: pctColor });
                drawRight(page3, fRow.fLat.toFixed(1), fcRight - 4, p3Y - 11, 7.5, font, rgb(0, 0, 0));
            } else {
                drawColCenter(page3, '-', fcLeft, fColWidths[1], p3Y - 11, 7.5, font, rgb(0.5, 0.5, 0.5));
            }

            // Col 2: M Lat
            fcLeft = fcRight;
            fcRight = fcLeft + fColWidths[2];
            if (fRow.mLat !== null && fRow.mLat !== undefined) {
                drawRight(page3, fRow.mLat.toFixed(1), fcRight - 5, p3Y - 11, 7.5, font, rgb(0.2, 0.2, 0.2));
            } else {
                drawColCenter(page3, '-', fcLeft, fColWidths[2], p3Y - 11, 7.5, font, rgb(0.5, 0.5, 0.5));
            }

            // Col 3: F-M Lat
            fcLeft = fcRight;
            fcRight = fcLeft + fColWidths[3];
            if (fRow.fMinusMLat !== null && fRow.fMinusMLat !== undefined) {
                drawRight(page3, fRow.fMinusMLat.toFixed(1), fcRight - 5, p3Y - 11, 7.5, font, rgb(0.2, 0.2, 0.2));
            } else {
                drawColCenter(page3, '-', fcLeft, fColWidths[3], p3Y - 11, 7.5, font, rgb(0.5, 0.5, 0.5));
            }

            // Col 4: Min M Lat
            fcLeft = fcRight;
            fcRight = fcLeft + fColWidths[4];
            if (fRow.minMLat !== null && fRow.minMLat !== undefined) {
                drawRight(page3, fRow.minMLat.toFixed(1), fcRight - 5, p3Y - 11, 7.5, font, rgb(0.2, 0.2, 0.2));
            } else {
                drawColCenter(page3, '-', fcLeft, fColWidths[4], p3Y - 11, 7.5, font, rgb(0.5, 0.5, 0.5));
            }

            // Col 5: KG Ref
            fcLeft = fcRight;
            fcRight = fcLeft + fColWidths[5];
            const refStr = `< ${fRow.refValue || 31} ms`;
            drawColCenter(page3, refStr, fcLeft, fColWidths[5], p3Y - 11, 7, font, rgb(0.35, 0.4, 0.45));

            // Col 6: Interpretation
            fcLeft = fcRight;
            fcRight = fcLeft + fColWidths[6];
            if (fRow.isProlonged) {
                const diffStr = fRow.diff !== undefined ? `+${fRow.diff} ms` : `prolonged`;
                const interpText = `Prolonged (${diffStr})`;
                page3.drawText(interpText, { x: fcLeft + 4, y: p3Y - 11, size: 7, font: fontBold, color: rgb(0.85, 0.15, 0.1) });
            } else {
                page3.drawText("Normal", { x: fcLeft + 4, y: p3Y - 11, size: 7, font: fontBold, color: rgb(0.05, 0.5, 0.2) });
            }

            p3Y -= fRowH;
        }

        drawCenterPage(page3, `3 of ${totalPagesStr}`, 35, 9, font, rgb(0.3, 0.35, 0.4));
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}
