import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Report, MotorNCSGroup } from '../types/report';
import { getDefaultMotorNCSGroups } from './extractionService';
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

    // Page 1: Standard A4 (595.44 x 841.92 pt)
    const page = pdfDoc.addPage([595.44, 841.92]);
    const { width } = page.getSize();

    // Geometric alignment grid
    const startX = 50;
    const tableWidth = 495;
    const endX = startX + tableWidth; // 545 (50pt margin on left and right)

    const drawCenterPage = (targetPage: any, text: string, y: number, size: number, f: any, color?: any) => {
        const textWidth = f.widthOfTextAtSize(text, size);
        targetPage.drawText(text, {
            x: (width - textWidth) / 2,
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

    // 1. Centered Hospital Official Header
    const hospitalName = report.hospitalName || "K G HOSPITAL";
    const location = report.hospitalLocation || "COIMBATORE";
    const labName = report.labName || "NeuroPhysiology Lab";
    const reportTitle = report.reportTitle || "NCS/EP/EMG REPORTS";

    drawCenterPage(page, hospitalName, 766, 20, fontBold, rgb(0.06, 0.16, 0.44));
    drawCenterPage(page, location, 748, 13, fontBold, rgb(0.15, 0.15, 0.15));
    drawCenterPage(page, labName, 728, 10.5, fontBold, rgb(0.2, 0.2, 0.2));
    drawCenterPage(page, reportTitle, 714, 10.5, fontBold, rgb(0.2, 0.2, 0.2));

    // Logo on Left side, perfectly aligned with left margin (startX = 50)
    const logoSize = 56;
    const logoX = startX;
    const logoY = 724;
    if (embeddedLogo) {
        page.drawImage(embeddedLogo, {
            x: logoX,
            y: logoY,
            width: logoSize,
            height: logoSize
        });
        page.drawRectangle({
            x: logoX - 0.5,
            y: logoY - 0.5,
            width: logoSize + 1,
            height: logoSize + 1,
            borderColor: rgb(0.7, 0.75, 0.8),
            borderWidth: 0.5
        });
    }

    // 2. Patient Information Card (aligned with startX = 50, width = 495)
    let curY = 698;
    const infoBoxHeight = 72;
    page.drawRectangle({
        x: startX,
        y: curY - infoBoxHeight,
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

    let lineY = curY - 14;
    // Row 1: Full Name / Gender
    page.drawText("Full Name:", { x: c1LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
    page.drawText(report.patientName || "Mr.Dhandapani A", { x: c1ValX, y: lineY, size: infoSize, font: fontBold, color: valColor });
    page.drawText("Gender:", { x: c2LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
    page.drawText(report.gender || "Male", { x: c2ValX, y: lineY, size: infoSize, font, color: valColor });

    // Row 2: Patient ID / Date of Birth
    lineY -= 14;
    page.drawText("Patient ID:", { x: c1LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
    page.drawText(report.patientId || "202511100114", { x: c1ValX, y: lineY, size: infoSize, font, color: valColor });
    page.drawText("Date of Birth:", { x: c2LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
    page.drawText(report.dob || "01-07-1955", { x: c2ValX, y: lineY, size: infoSize, font, color: valColor });

    // Row 3: Visit Date / Age
    lineY -= 14;
    page.drawText("Visit Date:", { x: c1LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
    page.drawText(report.visitDate || "28-09-2026 11:49", { x: c1ValX, y: lineY, size: infoSize, font, color: valColor });
    page.drawText("Age:", { x: c2LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
    page.drawText(report.age || "71 Years", { x: c2ValX, y: lineY, size: infoSize, font, color: valColor });

    // Row 4: Referring Physician
    lineY -= 14;
    page.drawText("Referring Physician:", { x: c1LabelX, y: lineY, size: infoSize, font: fontBold, color: labelColor });
    page.drawText(report.physician || "Dr.TCR.Ramakrishnan MDDM(Neuro)", { x: c1ValX, y: lineY, size: infoSize, font, color: valColor });

    // 3. Section Title Bar
    curY = curY - infoBoxHeight - 16;
    page.drawText("Motor NCS", {
        x: startX,
        y: curY,
        size: 11,
        font: fontBold,
        color: rgb(0.08, 0.12, 0.2)
    });

    const baselineNote = "KG Hospital Protocol: Median Lat <4.2 | Ulnar <3.4 | Peroneal <5.8 | Tibial <6.5";
    drawRight(page, baselineNote, endX, curY, 7.5, fontBold, rgb(0.2, 0.38, 0.65));

    curY -= 8;

    // 4. Clinical 9-Column Medical Table Setup (Total = 495 pt)
    const colWidths = [85, 58, 56, 38, 40, 94, 40, 50, 34];
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
    let currentPage = page;

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
            currentPage = pdfDoc.addPage([595.44, 841.92]);
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
            if (s.duration !== null && s.duration !== undefined) {
                drawRight(currentPage, `${s.duration}`, cRight - 5, curY - 10, 7.5, font, rgb(0.2, 0.2, 0.2));
            } else {
                drawColCenter(currentPage, '-', cLeft, colWidths[3], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            }

            // Col 4: Rel Amp (Right-aligned)
            cLeft = cRight;
            cRight = cLeft + colWidths[4];
            if (s.relAmp !== null && s.relAmp !== undefined) {
                drawRight(currentPage, `${s.relAmp}`, cRight - 5, curY - 10, 7.5, font, rgb(0.2, 0.2, 0.2));
            } else {
                drawColCenter(currentPage, '-', cLeft, colWidths[4], curY - 10, 7.5, font, rgb(0.5, 0.5, 0.5));
            }

            // Col 5: Segments (Left-aligned)
            cLeft = cRight;
            cRight = cLeft + colWidths[5];
            currentPage.drawText(s.segment || '-', { x: cLeft + 4, y: curY - 10, size: 6.5, font, color: rgb(0.2, 0.25, 0.3) });

            // Col 6: Lat Diff (Right-aligned)
            cLeft = cRight;
            cRight = cLeft + colWidths[6];
            if (s.latDiff !== null && s.latDiff !== undefined) {
                drawRight(currentPage, `${s.latDiff}`, cRight - 5, curY - 10, 7.5, font, rgb(0.2, 0.2, 0.2));
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

    // Page Number matching original "1 of 3" centered
    const totalPagesStr = report.totalPages ? `${report.totalPages}` : '3';
    drawCenterPage(currentPage, `1 of ${totalPagesStr}`, 35, 9, font, rgb(0.3, 0.35, 0.4));

    // Append remaining original pages (Sensory NCS, F Wave study, etc.)
    if (report.fileData && report.fileType) {
        try {
            if (report.fileType === 'application/pdf') {
                const srcDoc = await PDFDocument.load(report.fileData);
                const totalSrcPages = srcDoc.getPageCount();
                if (totalSrcPages > 1) {
                    const remainingIndices = Array.from({ length: totalSrcPages - 1 }, (_, i) => i + 1);
                    const copiedPages = await pdfDoc.copyPages(srcDoc, remainingIndices);
                    copiedPages.forEach(p => pdfDoc.addPage(p));
                }
            } else if (report.fileType === 'image/jpeg' || report.fileType === 'image/jpg' || report.fileType === 'image/png') {
                let img;
                if (report.fileType === 'image/png') {
                    img = await pdfDoc.embedPng(report.fileData);
                } else {
                    img = await pdfDoc.embedJpg(report.fileData);
                }
                const imgPage = pdfDoc.addPage([img.width, img.height]);
                imgPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
            }
        } catch (e) {
            console.error("Could not append remaining original pages to PDF", e);
        }
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
