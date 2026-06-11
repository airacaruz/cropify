import { onAuthStateChanged } from 'firebase/auth';
import { get, off, onValue, ref } from 'firebase/database';
import { collection, getDocs, query, where } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCallback, useEffect, useState } from 'react';
import {
    FaCheck,
    FaMicrochip,
    FaRedo,
    FaTimes,
    FaUserPlus,
    FaUsers
} from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import Navbar from '../../components/Navbar';
import { auth, db, realtimeDb } from '../../firebase';
import '../../styles/Dashboard/DashboardPage.css';
import '../../styles/Dashboard/ReportsModal.css';
import { adminAuditActions } from '../../utils/adminAuditLogger';
import { hashUID } from '../../utils/hashUtils';
import userSessionManager from '../../utils/userSessionManager';

function parseTrendPercent(trendRaw) {
    if (trendRaw === null || trendRaw === undefined) return null;
    const cleaned = String(trendRaw).replace(/%/g, '').trim();
    if (!cleaned) return null;
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
}

function getPrescriptiveInsights(kpiData, newUsersData, activeUsersCount, totalUsersNum) {
    const insights = [];
    const trendPct = parseTrendPercent(kpiData?.newUsersTrend);

    if (trendPct === null) {
        insights.push(
            'Month-over-month registration change could not be determined with the current KPI fields. Confirm that signup timestamps populate consistently before relying on comparative trends.'
        );
    } else if (trendPct < -5) {
        insights.push(
            `New registrations declined by approximately ${Math.abs(trendPct).toFixed(0)}% compared with the prior month. Review acquisition channels, pricing or positioning changes, and the onboarding funnel for friction.`
        );
    } else if (trendPct < 0) {
        insights.push(
            `New registrations dipped slightly (${trendPct.toFixed(0)}% versus the prior month). Treat this as an early indicator—validate with weekly cohort totals before reallocating acquisition budget.`
        );
    } else if (trendPct >= 15) {
        insights.push(
            `New registrations accelerated by about ${trendPct.toFixed(0)}% month over month. Document campaigns and releases that coincide with the lift so the playbook can be repeated or scaled responsibly.`
        );
    } else if (trendPct > 5) {
        insights.push(
            `Registration momentum is favourable (${trendPct.toFixed(0)}% versus the prior month). Reinforce what is already working while monitoring downstream activation and retention.`
        );
    } else if (trendPct > 0) {
        insights.push(
            'Registration volume increased modestly relative to last month. Consider targeted experiments to amplify reach while preserving conversion quality.'
        );
    } else if (trendPct === 0) {
        insights.push(
            'Registration volume was flat versus the prior month. Layer controlled experiments incrementally rather than disrupting a stable signup baseline.'
        );
    }

    const totalRounded =
        typeof totalUsersNum === 'number' && totalUsersNum > 0 && Number.isFinite(totalUsersNum)
            ? totalUsersNum
            : null;

    if (totalRounded !== null && Number.isFinite(activeUsersCount)) {
        const ratio = activeUsersCount / totalRounded;
        const pct = ratio * 100;
        if (activeUsersCount === 0) {
            insights.push(
                'No accounts currently qualify as “active” under the dashboard thresholds. Align session-timeout and activity telemetry with operational expectations before treating this metric as authoritative.'
            );
        } else if (ratio > 0.7) {
            insights.push(
                `Roughly ${pct.toFixed(0)}% of registered accounts show qualifying recent activity—a strong posture. Evaluate whether loyalty, advanced features, or capacity planning merits attention alongside growth.`
            );
        } else if (ratio < 0.3) {
            insights.push(
                `About ${pct.toFixed(0)}% of accounts show qualifying recent engagement. Assess lifecycle outreach, dormant-user campaigns, and in-product cues that drive return visits without oversaturating active cohorts.`
            );
        } else {
            insights.push(
                `Engagement translates to roughly ${pct.toFixed(0)}% of accounts with qualifying activity—a typical mid-range band for many platforms. Watch for divergence after releases, incidents, or policy changes.`
            );
        }
    }

    const months = Array.isArray(newUsersData) ? newUsersData : [];
    const totalAttributed = months.reduce((sum, row) => sum + (Number(row.newUsers) || 0), 0);

    if (months.length > 0) {
        const peakMonth = months.reduce((best, curr) =>
            (Number(curr.newUsers) || 0) > (Number(best.newUsers) || 0) ? curr : best,
            months[0],
        );
        const peakCount = Number(peakMonth?.newUsers) || 0;
        if (totalAttributed === 0) {
            insights.push(
                'No sign-ups mapped to calendar months are visible in this view. Inspect stored created-at timestamps on user records—missing values will suppress actionable registration timing insights.'
            );
        } else if (peakCount > 0) {
            const share = (peakCount / totalAttributed) * 100;
            insights.push(
                `Among months shown here, registrations peaked at ${peakCount.toLocaleString()} in ${peakMonth.month}, representing roughly ${share.toFixed(0)}% of registrations in this window—informative when planning staffing, support, or marketing rhythm.`
            );
        }
    }

    return insights;
}

const exportChartsAndPrescriptivePDF = async ({
    kpiData,
    newUsersData,
    totalUsersFormatted,
    activeUsersCount,
    prescriptiveInsights,
    sensorChartData,
    plantTypeDistribution,
    appReportTickets,
    newWindow
}) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    let yPosition = margin;

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
            return true;
        }
        return false;
    };

    // Add title page
    doc.setFontSize(24);
    doc.text('Cropify Dashboard Analytics Report', margin, yPosition);
    yPosition += 15;

    doc.setFontSize(12);
    doc.text('Comprehensive analytics and insights for Cropify hydroponic management system', margin, yPosition);
    yPosition += 30;

    // Add Executive Summary
    doc.setFontSize(16);
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(11);
    const summaryText = [
        'This report provides a comprehensive analysis of the Cropify platform performance,',
        'including user growth metrics, sensor data analytics, and plant type distribution.',
        'Key findings include user acquisition trends, system performance indicators,',
        'and actionable insights for optimizing hydroponic operations.'
    ];

    summaryText.forEach(line => {
        doc.text(line, 20, yPosition);
        yPosition += 6;
    });

    yPosition += 15;

    // Add Key Performance Indicators (KPIs) Section
    doc.setFontSize(16);
    doc.text('Key Performance Indicators (KPIs)', 20, yPosition);
    yPosition += 15;

    const kpiTableData = [
        ['Metric', 'Current Value', 'Trend', 'Status'],
        ['New Users (Current Month)', kpiData.newUsersCount?.toLocaleString?.() ?? String(kpiData.newUsersCount ?? '0'), kpiData.newUsersTrend || 'N/A', 'Recorded'],
        ['Total Users', totalUsersFormatted, '—', 'Recorded'],
        ['Active Users', activeUsersCount?.toLocaleString?.() ?? String(activeUsersCount ?? 0), '—', 'Recorded'],
        ['Sensor Logs', sensorChartData.length.toString(), '—', 'Recorded'],
    ];

    autoTable(doc, {
        head: [kpiTableData[0]],
        body: kpiTableData.slice(1),
        startY: yPosition,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [76, 175, 80] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    yPosition = doc.lastAutoTable.finalY + 20;

    // Add User Analytics Section
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.text('User Analytics & Growth Metrics', margin, yPosition);
    yPosition += 15;

    if (newUsersData && newUsersData.length > 0) {
        // Calculate growth metrics
        const totalNewUsers = newUsersData.reduce((sum, month) => sum + month.newUsers, 0);
        const avgMonthlyGrowth = totalNewUsers / newUsersData.length;
        const highestMonth = newUsersData.reduce((max, month) => month.newUsers > max.newUsers ? month : max, newUsersData[0]);

        doc.setFontSize(12);
        doc.text('Monthly User Growth Analysis:', margin, yPosition);
        yPosition += 10;

        const growthMetrics = [
            `• Total new users tracked: ${totalNewUsers}`,
            `• Average monthly growth: ${avgMonthlyGrowth.toFixed(1)} users`,
            `• Highest growth month: ${highestMonth.month} (${highestMonth.newUsers} users)`,
            `• Growth period: ${newUsersData.length} months`
        ];

        growthMetrics.forEach(metric => {
            checkPageBreak(8);
            doc.text(metric, margin + 5, yPosition);
            yPosition += 7;
        });

        yPosition += 15;

        // Enhanced monthly data table
        const monthlyData = newUsersData.map(month => [
            month.month,
            month.newUsers.toString(),
            totalNewUsers > 0
                ? `${((month.newUsers / totalNewUsers) * 100).toFixed(1)}%`
                : '0.0%',
            month.newUsers > avgMonthlyGrowth
                ? 'Above Avg'
                : month.newUsers < avgMonthlyGrowth ? 'Below Avg' : 'At Avg'
        ]);

        autoTable(doc, {
            head: [['Month', 'New Users', 'Percentage', 'Performance']],
            body: monthlyData,
            startY: yPosition,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Add Sensor Data Analytics Section
    if (sensorChartData && sensorChartData.length > 0) {
        doc.setFontSize(16);
        doc.text('Sensor Data Analytics', 20, yPosition);
        yPosition += 15;

        // Calculate sensor statistics
        const avgPH = (sensorChartData.reduce((sum, s) => sum + s.ph, 0) / sensorChartData.length).toFixed(2);
        const avgTDS = (sensorChartData.reduce((sum, s) => sum + s.tds, 0) / sensorChartData.length).toFixed(0);
        const avgWaterTemp = (sensorChartData.reduce((sum, s) => sum + s.waterTemp, 0) / sensorChartData.length).toFixed(1);
        const avgAirTemp = (sensorChartData.reduce((sum, s) => sum + s.airTemp, 0) / sensorChartData.length).toFixed(1);
        const avgHumidity = (sensorChartData.reduce((sum, s) => sum + s.humidity, 0) / sensorChartData.length).toFixed(1);

        doc.setFontSize(12);
        doc.text('Sensor Performance Summary:', 20, yPosition);
        yPosition += 10;

        const sensorMetrics = [
            `• Total sensor readings: ${sensorChartData.length}`,
            `• Average pH Level: ${avgPH} (Optimal: 5.5-7.5)`,
            `• Average TDS: ${avgTDS} ppm (Optimal: 500-1500)`,
            `• Average Water Temperature: ${avgWaterTemp}°C (Optimal: 18-24°C)`,
            `• Average Air Temperature: ${avgAirTemp}°C (Optimal: 20-26°C)`,
            `• Average Humidity: ${avgHumidity}% (Optimal: 40-70%)`
        ];

        sensorMetrics.forEach(metric => {
            doc.text(metric, 25, yPosition);
            yPosition += 7;
        });

        yPosition += 10;

        const sensorTableData = sensorChartData.map(session => [
            session.timestamp ? new Date(session.timestamp).toLocaleString() : '—',
            Number(session.ph ?? 0).toFixed(2),
            String(session.tds ?? '—'),
            `${Number(session.waterTemp ?? 0).toFixed(1)}°C`,
            `${Number(session.airTemp ?? 0).toFixed(1)}°C`,
            `${Number(session.humidity ?? 0).toFixed(1)}%`
        ]);

        doc.setFontSize(10);
        doc.text(`All sensor readings (${sensorChartData.length} rows)`, 20, yPosition);
        yPosition += 8;

        autoTable(doc, {
            head: [['Date/Time', 'pH', 'TDS (ppm)', 'Water Temp', 'Air Temp', 'Humidity']],
            body: sensorTableData,
            startY: yPosition,
            styles: { fontSize: 7, cellPadding: 1 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
        });

        yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Add Plant Type Distribution Section
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.text('Hydroponic Plant Type Distribution', margin, yPosition);
    yPosition += 10;

    if (plantTypeDistribution?.length > 0) {
        const totalPlants = plantTypeDistribution.reduce((s, row) => s + row.count, 0);
        const rows = plantTypeDistribution.map(({ name, count }) => [
            name,
            String(count),
            totalPlants > 0 ? `${((count / totalPlants) * 100).toFixed(1)}%` : '0%',
        ]);
        autoTable(doc, {
            head: [['Plant type', 'Kits', 'Share']],
            body: rows,
            startY: yPosition,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: margin, right: margin },
        });
        yPosition = doc.lastAutoTable.finalY + 18;
        doc.setFontSize(10);
        doc.text('(Counts reflect linked sensor kits grouped by plant name.)', margin, yPosition);
        yPosition += 12;
    } else {
        doc.setFontSize(11);
        doc.text('No plant type distribution data from sensor kits.', margin, yPosition);
        yPosition += 12;
    }

    // Add Prescriptive Insights Section
    doc.setFontSize(16);
    doc.setTextColor(33, 33, 33);
    doc.text('Prescriptive Insights & Recommendations', margin, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('The following synthesis updates with each PDF export according to KPIs loaded on the dashboard.', margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 14;

    const wrapBullet = (paragraph) => {
        const bulletX = margin;
        const hangIndent = 4;
        const lineWidth = contentWidth - hangIndent;
        const lines = doc.splitTextToSize(paragraph, lineWidth);
        lines.forEach((line, i) => {
            checkPageBreak(7);
            if (i === 0) {
                doc.setFontSize(11);
                doc.text(`\u2022  ${line}`, bulletX, yPosition);
            } else {
                doc.text(line, bulletX + hangIndent + 7, yPosition);
            }
            yPosition += 6;
        });
        yPosition += 6;
    };

    doc.setFontSize(11);

    const fallbackBullets = [
        'Operational insight text was unavailable. Refresh the dashboard, confirm Firebase connectivity, and export again.',
        'Correlate any narrative shift with deployments, outages, marketing pushes, or data-quality initiatives on the precise export date shown in the footer.',
    ];

    if (prescriptiveInsights && prescriptiveInsights.length > 0) {
        prescriptiveInsights.forEach(wrapBullet);
    } else {
        fallbackBullets.forEach(wrapBullet);
    }

    yPosition += 8;

    // Add Charts Section
    async function getChartImage(chartId) {
        const chartElement = document.getElementById(chartId);
        if (chartElement) {
            const canvas = await html2canvas(chartElement);
            return canvas.toDataURL('image/png');
        }
        return null;
    }

    const chartList = [
        { id: 'chart-new-users', title: 'Monthly New User Acquisition' },
        { id: 'chart-active-users', title: 'Monthly Active Users' },
        { id: 'chart-plant-types', title: 'Hydroponic Plant Types Distribution' },
    ];

    const chartImages = [];
    for (let i = 0; i < chartList.length; i++) {
        const img = await getChartImage(chartList[i].id);
        chartImages.push({ ...chartList[i], img });
    }

    // Add charts to PDF with proper spacing
    let chartIdx = 0;
    while (chartIdx < chartImages.length) {
        checkPageBreak(120);
        if (chartIdx > 0) {
            doc.addPage();
            yPosition = margin;
        }

        doc.setFontSize(16);
        doc.text('Visual Analytics Charts', margin, yPosition);
        yPosition += 20;

        const chartsOnPage = chartImages.slice(chartIdx, chartIdx + 1); // One chart per page for better layout
        const chartHeight = 100;
        const chartWidth = contentWidth;

        chartsOnPage.forEach((chart) => {
            checkPageBreak(120);
            doc.setFontSize(12);
            doc.text(chart.title, margin, yPosition);
            yPosition += 10;

            if (chart.img) {
                doc.addImage(chart.img, 'PNG', margin, yPosition, chartWidth, chartHeight);
                yPosition += chartHeight + 20;
            } else {
                doc.setFontSize(10);
                doc.text('Chart not available', margin, yPosition);
                yPosition += 20;
            }
        });

        chartIdx += 1;
    }

    if (appReportTickets?.length > 0) {
        doc.addPage();
        yPosition = margin;
        doc.setFontSize(16);
        doc.text('App Report Tickets', margin, yPosition);
        yPosition += 14;
        doc.setFontSize(10);
        doc.text(`Total tickets included: ${appReportTickets.length}`, margin, yPosition);
        yPosition += 10;

        const reportRows = appReportTickets.map((t) => {
            let tsLabel = '—';
            try {
                const ts = t.timestamp instanceof Date ? t.timestamp : new Date(t.timestamp);
                tsLabel = Number.isNaN(ts.getTime()) ? '—' : ts.toLocaleString();
            } catch {
                tsLabel = '—';
            }
            const rawMsg = (t.fullMessage || t.title || '').replace(/\s+/g, ' ').trim();
            const summary = rawMsg.length > 90 ? `${rawMsg.slice(0, 90)}…` : rawMsg;
            const uidRaw = (t.fullUserId || t.userId || '—').toString();
            const uidShown = uidRaw.length > 28 ? `${uidRaw.slice(0, 28)}…` : uidRaw;
            return [t.id, t.type || 'Unknown', tsLabel, summary, uidShown];
        });

        autoTable(doc, {
            head: [['Ticket ID', 'Type', 'Reported', 'Summary', 'User ID']],
            body: reportRows,
            startY: yPosition,
            styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: margin, right: margin },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 22 },
                2: { cellWidth: 28 },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 30 },
            },
        });
    }

    // Add footer to all pages
    const pageCount = doc.internal.getNumberOfPages();
    const generatedDateTime = `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, margin, pageHeight - 10);
        doc.text('Cropify Dashboard Analytics Report', pageWidth - 80, pageHeight - 10);
        doc.text(generatedDateTime, margin, pageHeight - 20);
    }

    try {
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        if (newWindow) {
            newWindow.location.href = blobUrl;
        } else {
            window.open(blobUrl, '_blank');
        }
    } catch (error) {
        console.error("Error displaying PDF in new tab:", error);
        if (newWindow) newWindow.close();
        // Fallback: save PDF directly
        doc.save('Cropify_Dashboard_Analytics_Report.pdf');
    }
};

const PLANT_CHART_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#009688', '#F44336', '#795548'];

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState(null);
    const [adminName, setAdminName] = useState("");
    const [uid, setUid] = useState(null);
    const navigate = useNavigate();

    const [newUsersData, setNewUsersData] = useState([]);
    const [dailyActiveUsersData, setDailyActiveUsersData] = useState([]);
    const [kpiData, setKpiData] = useState({ newUsersCount: 0, newUsersTrend: '0%' });
    const [activeUsersCount, setActiveUsersCount] = useState(0);
    const [totalUsersCount, setTotalUsersCount] = useState(0);
    const [plantTypeDistribution, setPlantTypeDistribution] = useState([]);

    const [sensorSessions, setSensorSessions] = useState([]);
    const [showReportsModal, setShowReportsModal] = useState(false);
    const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
    const [showDownloadSuccessModal, setShowDownloadSuccessModal] = useState(false);
    const [reportTickets, setReportTickets] = useState([]);
    const [allReportTickets, setAllReportTickets] = useState([]);
    const [recentSensorKits, setRecentSensorKits] = useState([]);
    const [_archivedSensorKits, setArchivedSensorKits] = useState([]); // Archived sensor kits (for future use)
    const [sensorLoading, setSensorLoading] = useState(true);
    const [reportsLoading, setReportsLoading] = useState(false);

    // Separate function to fetch report tickets
    const fetchReportTickets = useCallback(async () => {
        try {
            setReportsLoading(true);
            const reportsSnapshot = await getDocs(collection(db, 'reports'));

            const reports = reportsSnapshot.docs.map(doc => {
                const data = doc.data();

                // Handle timestamp properly - it might be a string or Firestore timestamp
                let timestamp;
                if (data.timestamp) {
                    if (data.timestamp.toDate && typeof data.timestamp.toDate === 'function') {
                        timestamp = data.timestamp.toDate();
                    } else if (typeof data.timestamp === 'string') {
                        timestamp = new Date(data.timestamp);
                    } else {
                        timestamp = new Date(data.timestamp);
                    }
                } else {
                    timestamp = new Date();
                }

                return {
                    id: doc.id,
                    title: data.message || 'No title',
                    type: data.type || 'Unknown',
                    userId: data.userId || 'Unknown',
                    timestamp: timestamp,
                    imageUrl: data.imageUrl || null,
                    fullMessage: data.message || '', // Keep full message for modal
                    fullUserId: data.userId || '' // Keep full user ID for modal
                };
            });

            // Sort by timestamp (newest first)
            const sortedReports = reports.sort((a, b) => b.timestamp - a.timestamp);
            setAllReportTickets(sortedReports);

            // Take first 3 for the dashboard card
            setReportTickets(sortedReports.slice(0, 3));
            setReportsLoading(false);
        } catch (error) {
            console.error('Error fetching report tickets:', error);
            setReportsLoading(false);
            setReportTickets([]);
            setAllReportTickets([]);
        }
    }, []);

    // Fetch recent sensor data for dashboard (using same logic as SensorLogs)
    const fetchRecentSensorData = useCallback(async () => {
        try {
            setSensorLoading(true);
            const activeKits = [];
            const archivedKits = [];

            // Fetch from Firestore SensorKits collection
            try {
                const sensorKitsRef = collection(db, 'SensorKits');
                const sensorKitsSnapshot = await getDocs(sensorKitsRef);

                sensorKitsSnapshot.forEach((doc) => {
                    const data = doc.data();

                    // Filter out hardcoded/system entries
                    const isHardcodedEntry = (
                        data.plantName === 'plantName' ||
                        data.userId === 'userId' ||
                        data.plantName === 'userId' ||
                        data.userId === 'plantName' ||
                        data.userId === 'system' ||
                        !data.userId ||
                        !data.plantName ||
                        data.plantName === 'N/A' ||
                        data.userId === 'N/A'
                    );

                    if (!isHardcodedEntry) {
                        const kit = {
                            id: doc.id,
                            code: data.sensorCode || 'N/A',
                            linked: data.linked || false,
                            linkedPlantId: data.linkedPlantId || null,
                            plantName: data.plantName || 'N/A',
                            userId: data.userId || 'system',
                            lastLinkTimestamp: data.lastLinkTimestamp || new Date().toISOString(),
                            status: data.linked ? 'Active' : 'Archived',
                            user: data.userId || 'system',
                            temperature: 0,
                            humidity: 0,
                            ph: 0
                        };

                        // Separate active and archived kits
                        if (data.linked === true) {
                            activeKits.push(kit);
                        } else {
                            archivedKits.push(kit);
                        }
                    }
                });

            } catch {
                console.log('Firestore sensor kits fetch completed');
            }

            // Fetch from Realtime Database Sensors path with timeout
            try {
                const sensorsRef = ref(realtimeDb, 'Sensors');

                // Add timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Realtime Database fetch timeout')), 5000); // 5 second timeout
                });

                const snapshot = await Promise.race([get(sensorsRef), timeoutPromise]);

                if (snapshot.exists()) {
                    const sensorsData = snapshot.val();

                    // Process each sensor from Realtime Database
                    Object.keys(sensorsData).forEach(sensorId => {
                        const sensorData = sensorsData[sensorId];

                        // Check if this sensor kit already exists in Firestore data
                        const existingKit = activeKits.find(kit => kit.id === sensorId);

                        if (existingKit) {
                            // Update existing kit with real-time data
                            existingKit.code = sensorData.sensorCode || existingKit.code;
                            existingKit.linked = sensorData.linked !== undefined ? sensorData.linked : existingKit.linked;
                            existingKit.status = sensorData.linked ? 'Active' : 'Archived';
                            existingKit.lastLinkTimestamp = new Date().toISOString();
                            existingKit.temperature = sensorData.temperature || 0;
                            existingKit.humidity = sensorData.humidity || 0;
                            existingKit.ph = sensorData.ph || 0;
                        } else {
                            // Only create new kit entry if it has a real userId (not system) AND is linked AND not hardcoded
                            const isHardcodedEntry = (
                                sensorData.plantName === 'plantName' ||
                                sensorData.userId === 'userId' ||
                                sensorData.plantName === 'userId' ||
                                sensorData.userId === 'plantName' ||
                                sensorData.userId === 'system' ||
                                !sensorData.userId ||
                                !sensorData.plantName ||
                                sensorData.plantName === 'N/A' ||
                                sensorData.userId === 'N/A'
                            );

                            if (sensorData.userId && sensorData.userId !== 'system' && !isHardcodedEntry) {
                                const kit = {
                                    id: sensorId,
                                    code: sensorData.sensorCode || 'N/A',
                                    linked: sensorData.linked || false,
                                    linkedPlantId: sensorData.linkedPlantId || null,
                                    plantName: sensorData.plantName || 'N/A',
                                    userId: sensorData.userId || 'system',
                                    lastLinkTimestamp: new Date().toISOString(),
                                    status: sensorData.linked ? 'Active' : 'Archived',
                                    user: sensorData.userId || 'system',
                                    temperature: sensorData.temperature || 0,
                                    humidity: sensorData.humidity || 0,
                                    ph: sensorData.ph || 0
                                };

                                // Add to appropriate array based on linked status
                                if (sensorData.linked === true) {
                                    activeKits.push(kit);
                                } else {
                                    archivedKits.push(kit);
                                }
                            }
                        }
                    });

                } else {
                    console.log('No realtime sensor data found');
                }
            } catch {
                console.log('Realtime database fetch completed with fallback to Firestore');
            }

            const allKitsForPlants = [...activeKits, ...archivedKits];
            const plantCounts = {};
            allKitsForPlants.forEach((kit) => {
                const name = (kit.plantName || '').trim();
                if (name && name !== 'N/A') {
                    plantCounts[name] = (plantCounts[name] || 0) + 1;
                }
            });
            const plantDistribution = Object.entries(plantCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => ({ name, count }));
            setPlantTypeDistribution(plantDistribution);

            // Sort by lastLinkTimestamp (most recent first) and limit to 3 for dashboard
            const sortedActiveKits = activeKits
                .sort((a, b) => new Date(b.lastLinkTimestamp) - new Date(a.lastLinkTimestamp))
                .slice(0, 3);

            const sortedArchivedKits = archivedKits
                .sort((a, b) => new Date(b.lastLinkTimestamp) - new Date(a.lastLinkTimestamp));

            setRecentSensorKits(sortedActiveKits);
            setArchivedSensorKits(sortedArchivedKits);

        } catch (error) {
            console.error('Error fetching recent sensor data for dashboard:', error);
            setRecentSensorKits([]);
            setArchivedSensorKits([]);
            setPlantTypeDistribution([]);
        } finally {
            setSensorLoading(false);
        }
    }, []);

    const fetchAnalyticsData = useCallback(async () => {
        try {
            console.log('fetchAnalyticsData called');
            // Clean up expired sessions before calculating active users
            await userSessionManager.cleanupExpiredSessions();

            const usersCollection = collection(db, 'users');
            const snapshot = await getDocs(usersCollection);

            const userCountsByMonth = {};
            snapshot.forEach((doc) => {
                const user = doc.data();
                const createdAt = user.createdAt?.toDate?.();
                if (!createdAt) return;
                const month = createdAt.toLocaleString('default', { month: 'short' });
                userCountsByMonth[month] = (userCountsByMonth[month] || 0) + 1;
            });

            const orderedMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const chartData = orderedMonths.map((month) => ({
                month,
                newUsers: userCountsByMonth[month] || 0,
            }));

            const currentMonthIndex = new Date().getMonth();
            const lastMonthCount = chartData[currentMonthIndex]?.newUsers || 0;
            const prevMonthCount = chartData[currentMonthIndex - 1]?.newUsers || 0;
            const trend =
                prevMonthCount === 0 ? '0%' :
                    `${(((lastMonthCount - prevMonthCount) / prevMonthCount) * 100).toFixed(0)}%`;

            setNewUsersData(chartData);
            setKpiData({ newUsersCount: lastMonthCount, newUsersTrend: trend });
            setTotalUsersCount(snapshot.size);

            const sessionLogs = collection(db, 'user_logs_UserSessions');
            const logSnapshot = await getDocs(sessionLogs);

            const monthlyUserMap = {};
            logSnapshot.forEach((doc) => {
                const log = doc.data();
                const loginTime = log.loginTime;
                const userId = log.userId;
                if (!loginTime || !userId) return;

                let parsedDate;
                if (typeof loginTime.toDate === 'function') {
                    parsedDate = loginTime.toDate();
                } else if (typeof loginTime === 'string') {
                    parsedDate = new Date(loginTime.replace(' at ', ' '));
                } else {
                    parsedDate = new Date(loginTime);
                }
                if (isNaN(parsedDate)) return;

                const month = parsedDate.toLocaleString('default', { month: 'short' });
                const year = parsedDate.getFullYear();
                const monthYear = `${month} ${year}`;

                if (!monthlyUserMap[monthYear]) monthlyUserMap[monthYear] = new Set();
                monthlyUserMap[monthYear].add(userId);
            });

            const years = new Set();
            Object.keys(monthlyUserMap).forEach((monthYear) => {
                const year = parseInt(monthYear.split(' ')[1], 10);
                years.add(year);
            });
            const orderedYears = Array.from(years).sort();
            const fullMonthYearList = [];
            orderedMonths.forEach((month) => {
                orderedYears.forEach((year) => fullMonthYearList.push(`${month} ${year}`));
            });

            const monthlyActiveUsersArray = fullMonthYearList.map((monthYear) => {
                const [month] = monthYear.split(' ');
                return {
                    month,
                    users: monthlyUserMap[monthYear] ? monthlyUserMap[monthYear].size : 0,
                };
            });

            setDailyActiveUsersData(monthlyActiveUsersArray);

            // Fix: Calculate truly active users (not just all users who ever logged in)
            const now = new Date();
            const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

            const activeSessions = logSnapshot.docs.filter(doc => {
                const data = doc.data();

                // Must have a userId
                if (!data.userId) return false;

                // Check if session is marked as active (if field exists)
                if (data.isActive === false) return false;

                // Check if user has logged out (if logoutTime exists)
                if (data.logoutTime) return false;

                // Check if user has recent activity (if lastActivity exists)
                if (data.lastActivity) {
                    try {
                        const lastActivity = data.lastActivity.toDate ? data.lastActivity.toDate() : new Date(data.lastActivity);
                        const timeSinceActivity = now - lastActivity;
                        if (timeSinceActivity > ACTIVITY_TIMEOUT) return false;
                    } catch {
                        // If we can't parse the date, consider it inactive
                        return false;
                    }
                }

                // If no lastActivity field, check loginTime as fallback
                if (data.loginTime) {
                    try {
                        const loginTime = data.loginTime.toDate ? data.loginTime.toDate() : new Date(data.loginTime);
                        const timeSinceLogin = now - loginTime;
                        // If logged in more than 24 hours ago without activity tracking, consider inactive
                        if (timeSinceLogin > 24 * 60 * 60 * 1000) return false;
                    } catch {
                        return false;
                    }
                }

                return true;
            });

            // Count unique active users
            const uniqueActiveUsers = new Set(activeSessions.map(doc => doc.data().userId));
            const activeUserCount = uniqueActiveUsers.size;

            console.log(`Active users calculation: ${activeSessions.length} active sessions, ${activeUserCount} unique active users`);

            setActiveUsersCount(activeUserCount);

            // Fetch recent sensor data for dashboard
            await fetchRecentSensorData();

            // Fetch sensor logs from Firestore
            const sensorSnapshot = await getDocs(collection(db, 'sensor_sessions'));
            const sessions = sensorSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    timestamp: data.timestamp?.toDate
                        ? data.timestamp.toDate().toISOString()
                        : data.timestamp,
                    ph: data.ph,
                    tds: data.tds,
                    waterTemp: data.waterTemp,
                    airTemp: data.airTemp,
                    humidity: data.humidity,
                };
            });
            const allSessions = [...sessions];
            allSessions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            setSensorSessions(allSessions);


            // Fetch report tickets from Firestore - moved outside main try-catch for better error handling
            await fetchReportTickets();

        } catch (error) {
            console.error('Error fetching analytics data:', error);
            setSensorSessions([]);
            setTotalUsersCount(0);
            setReportTickets([]);
            setReportsLoading(false);
        }
    }, [fetchRecentSensorData, fetchReportTickets]);

    const handlePrintConfirm = async () => {
        // Open a new blank tab immediately to prevent browser popup blockers from stopping it
        const newWindow = window.open('about:blank', '_blank');
        if (newWindow) {
            newWindow.document.write(
                '<div style="font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: #333; background: #f8f9fa;">' +
                '  <div style="text-align: center; padding: 24px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">' +
                '    <div style="width: 40px; height: 40px; border: 3px solid #e9ecef; border-top: 3px solid #2e7d32; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>' +
                '    <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">Generating Dashboard Summary...</div>' +
                '    <div style="font-size: 13px; color: #666;">This will open the PDF in this tab once ready.</div>' +
                '  </div>' +
                '  <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>' +
                '</div>'
            );
        }

        // Log the print dashboard action
        if (uid && adminName) {
            await adminAuditActions.printDashboard(uid, adminName);
        }

        try {
            await exportChartsAndPrescriptivePDF({
                kpiData,
                newUsersData,
                totalUsersFormatted: totalUsersCount.toLocaleString(),
                activeUsersCount,
                prescriptiveInsights,
                sensorChartData,
                plantTypeDistribution,
                appReportTickets: allReportTickets,
                newWindow
            });
        } catch (error) {
            console.error("Error generating report:", error);
            if (newWindow) {
                newWindow.close();
            }
        }
        setShowPrintConfirmModal(false);

        // Show download success modal
        setShowDownloadSuccessModal(true);

        // Auto-hide success modal after 3 seconds
        setTimeout(() => {
            setShowDownloadSuccessModal(false);
        }, 3000);
    };

    const handlePrintCancel = () => {
        setShowPrintConfirmModal(false);
    };


    useEffect(() => {
        const storedName = localStorage.getItem("adminName") || "";
        const cleanName = storedName.replace(/\s*\(superadmin\)|\s*\(admin\)/gi, "");
        setAdminName(cleanName || "Admin");

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                navigate('/', { replace: true });
            } else {
                try {
                    setUid(user.uid);
                } catch (err) {
                    console.error("Error setting uid:", err);
                }
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    // Track login action once when component is fully loaded
    useEffect(() => {
        if (uid && adminName && !loading) {
            adminAuditActions.login(uid, adminName);
        }
    }, [uid, adminName, loading]);

    useEffect(() => {
        if (!uid) return;

        const fetchRole = async () => {
            try {
                const q = query(
                    collection(db, "admins"),
                    where("adminId", "==", uid)
                );
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        const userRole = (data.role || "unknown").toLowerCase();
                        setRole(userRole);
                        const cleanName = (data.name || "Admin").replace(/\s*\(superadmin\)|\s*\(admin\)/gi, "");
                        setAdminName(cleanName);
                    });
                } else {
                    setRole("unknown");
                }
            } catch (err) {
                console.error("Error fetching role:", err);
                setRole("unknown");
            } finally {
                setLoading(false);
                // Fetch analytics data after role is set
                setTimeout(() => {
                    fetchAnalyticsData();
                }, 100);
            }
        };

        fetchRole();
    }, [uid, fetchAnalyticsData]);

    // Separate useEffect to fetch analytics data when user is authenticated
    useEffect(() => {
        if (uid && role && (role === 'admin' || role === 'superadmin')) {
            console.log('User authenticated, fetching analytics data...');
            console.log('Current user:', { uid, role, adminName });
            fetchAnalyticsData();
        }
    }, [uid, role, adminName, fetchAnalyticsData]);

    // Separate useEffect to fetch report tickets when user is authenticated
    useEffect(() => {
        if (uid && role && (role === 'admin' || role === 'superadmin')) {
            console.log('User authenticated, fetching report tickets...');
            fetchReportTickets();
        }
    }, [uid, role, fetchReportTickets]);

    // Real-time listener for sensor status changes (linked/unlinked)
    useEffect(() => {
        if (!uid || !role || (role !== 'admin' && role !== 'superadmin')) return;

        console.log('Setting up real-time sensor status listener for Dashboard...');
        const sensorsRef = ref(realtimeDb, 'Sensors');

        const unsubscribeRealtime = onValue(sensorsRef, (snapshot) => {
            if (snapshot.exists()) {
                console.log('Dashboard: Real-time sensor status update received');
                const sensorsData = snapshot.val();

                // Update recent sensor kits based on linked status
                setRecentSensorKits(prevKits => {
                    const updatedKits = [...prevKits];

                    Object.keys(sensorsData).forEach(sensorId => {
                        const sensorData = sensorsData[sensorId];
                        const existingKitIndex = updatedKits.findIndex(kit => kit.id === sensorId);

                        if (existingKitIndex !== -1) {
                            // Check if sensor is now unlinked - if so, remove it from recent kits
                            if (sensorData.linked === false) {
                                console.log(`Dashboard: Archiving unlinked sensor ${sensorId} from Recent Sensor Kits`);
                                updatedKits.splice(existingKitIndex, 1);
                            } else {
                                // Update existing kit with latest data
                                updatedKits[existingKitIndex] = {
                                    ...updatedKits[existingKitIndex],
                                    code: sensorData.code || sensorData.sensorCode || updatedKits[existingKitIndex].code,
                                    linked: sensorData.linked !== undefined ? sensorData.linked : updatedKits[existingKitIndex].linked,
                                    linkedPlantId: sensorData.linkedPlantId || updatedKits[existingKitIndex].linkedPlantId,
                                    plantName: sensorData.plantName || updatedKits[existingKitIndex].plantName,
                                    userId: sensorData.userId || updatedKits[existingKitIndex].userId,
                                    lastLinkTimestamp: new Date().toISOString(),
                                    status: sensorData.linked ? 'Active' : 'Archived',
                                    temperature: sensorData.temperature || 0,
                                    humidity: sensorData.humidity || 0,
                                    ph: sensorData.ph || 0
                                };
                            }
                        } else {
                            // Check if this is a newly linked sensor that should be added
                            if (sensorData.linked === true && sensorData.userId && sensorData.userId !== 'system') {
                                // Filter out hardcoded/system entries
                                const isHardcodedEntry = (
                                    sensorData.plantName === 'plantName' ||
                                    sensorData.userId === 'userId' ||
                                    sensorData.plantName === 'userId' ||
                                    sensorData.userId === 'plantName' ||
                                    sensorData.userId === 'system' ||
                                    !sensorData.userId ||
                                    !sensorData.plantName ||
                                    sensorData.plantName === 'N/A' ||
                                    sensorData.userId === 'N/A'
                                );

                                if (!isHardcodedEntry) {
                                    console.log(`Dashboard: Adding newly linked sensor ${sensorId} to Recent Sensor Kits`);
                                    const newKit = {
                                        id: sensorId,
                                        code: sensorData.code || sensorData.sensorCode || 'N/A',
                                        linked: sensorData.linked || false,
                                        linkedPlantId: sensorData.linkedPlantId || null,
                                        plantName: sensorData.plantName || 'N/A',
                                        userId: sensorData.userId || 'system',
                                        lastLinkTimestamp: new Date().toISOString(),
                                        status: 'Active',
                                        user: sensorData.userId || 'system',
                                        temperature: sensorData.temperature || 0,
                                        humidity: sensorData.humidity || 0,
                                        ph: sensorData.ph || 0
                                    };

                                    // Add to the beginning and keep only the 3 most recent
                                    updatedKits.unshift(newKit);
                                    if (updatedKits.length > 3) {
                                        updatedKits.splice(3);
                                    }
                                }
                            }
                        }
                    });

                    return updatedKits;
                });
            }
        }, (error) => {
            console.error('Dashboard: Real-time sensor status listener error:', error);
        });

        return () => {
            console.log('Dashboard: Cleaning up real-time sensor status listener');
            off(sensorsRef, 'value', unsubscribeRealtime);
        };
    }, [uid, role]);


    const prescriptiveInsights = getPrescriptiveInsights(kpiData, newUsersData, activeUsersCount, totalUsersCount);

    if (loading) {
        return <div className="loading-container"><p>Loading...</p></div>;
    }

    const sensorChartData = sensorSessions.map(session => ({
        timestamp: session.timestamp,
        ph: session.ph,
        tds: session.tds,
        waterTemp: session.waterTemp,
        airTemp: session.airTemp,
        humidity: session.humidity,
    }));


    const handlePrintSummary = () => {
        setShowPrintConfirmModal(true);
    };

    return (
        <div className="dashboard-container">
            <Navbar role={role} adminName={adminName} adminId={uid} onPrintSummary={handlePrintSummary} />


            {role === "superadmin" && (
                <div className="superadmin-section"></div>
            )}

            {role === "admin" && (
                <div className="admin-section"></div>
            )}

            {role === "unknown" && (
                <div className="unknown-section">
                    <h3>Unauthorized</h3>
                    <p>You don’t have access. Contact your administrator.</p>
                </div>
            )}

            {(role === "superadmin" || role === "admin") && (
                <div className="dashboard-analytics-section">
                    <h1 className="sr-only">Dashboard Overview</h1>
                    <div className="kpi-cards-container">
                        <div className="kpi-card">
                            <h4 className="kpi-card-title">
                                <FaUserPlus color="#4CAF50" size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
                                New Users (Current Month)
                            </h4>
                            <h2 className="kpi-value">{kpiData.newUsersCount.toLocaleString()}</h2>
                            <p className="kpi-trend">
                                <span className={parseFloat(kpiData.newUsersTrend) > 0 ? 'text-green' : 'text-red'}>
                                    {parseFloat(kpiData.newUsersTrend) > 0 ? '▲' : '▼'} {kpiData.newUsersTrend}
                                </span>{' '}
                                vs. last month
                            </p>
                        </div>

                        <div className="kpi-card app-reports-card">
                            <div className="app-reports-header">
                                <h4 className="kpi-card-title">
                                    <FaMicrochip color="#4CAF50" size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
                                    App Report Tickets
                                </h4>
                                <button
                                    className="refresh-btn-small"
                                    onClick={fetchReportTickets}
                                    disabled={reportsLoading}
                                >
                                    <FaRedo className={reportsLoading ? 'spin' : ''} />
                                    {reportsLoading ? 'Refreshing...' : 'Refresh'}
                                </button>
                            </div>
                            <div className="app-reports-list">
                                {reportsLoading ? (
                                    <div className="loading-reports">
                                        <p>Loading report tickets...</p>
                                    </div>
                                ) : reportTickets.length > 0 ? (
                                    reportTickets.map((ticket) => (
                                        <div key={ticket.id} className="app-report-item">
                                            <div className="ticket-info">
                                                <span className="ticket-id">{ticket.id}</span>
                                                <span className={`ticket-status ${ticket.type.toLowerCase().replace(' ', '-')}`}>
                                                    {ticket.type}
                                                </span>
                                                <span className="ticket-title">"{ticket.title}"</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-tickets">
                                        <p>No report tickets found</p>
                                    </div>
                                )}
                            </div>
                            <div className="view-all-container">
                                <button className="view-all-btn" onClick={() => setShowReportsModal(true)}>
                                    View All Report Tickets
                                </button>
                            </div>
                        </div>

                        <div className="kpi-card sensor-kits-card">
                            <div className="sensor-kits-header">
                                <h4 className="kpi-card-title">
                                    <FaMicrochip color="#4CAF50" size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
                                    Recent Sensor Kits
                                </h4>
                                <button
                                    className="refresh-btn-small"
                                    onClick={fetchRecentSensorData}
                                    disabled={sensorLoading}
                                >
                                    <FaRedo className={sensorLoading ? 'spin' : ''} />
                                    {sensorLoading ? 'Refreshing...' : 'Refresh'}
                                </button>
                            </div>
                            <div className="sensor-kits-list">
                                {sensorLoading ? (
                                    <div className="loading-sensor-data">
                                        <div className="loading-spinner" style={{
                                            width: '20px',
                                            height: '20px',
                                            border: '2px solid #f3f3f3',
                                            borderTop: '2px solid #2196F3',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite',
                                            margin: '0 auto 10px'
                                        }}></div>
                                        <p style={{ fontSize: '14px', color: '#555', textAlign: 'center' }}>Loading sensor data...</p>
                                    </div>
                                ) : recentSensorKits.length > 0 ? (
                                    recentSensorKits.map((kit) => (
                                        <div key={kit.id} className="sensor-kit-item">
                                            <div className="kit-info">
                                                <span className="kit-id">{kit.id}</span>
                                                <span className={`kit-status-badge ${kit.linked ? 'linked' : 'unlinked'}`}>
                                                    {kit.linked ? 'Linked' : 'Unlinked'}
                                                </span>
                                                {kit.plantName && <span className="kit-plant">"{kit.plantName}"</span>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-sensor-data">
                                        <p>No sensor data available</p>
                                        <small>There's no user connected to their sensor device yet</small>
                                    </div>
                                )}
                            </div>
                            <div className="view-all-container">
                                <button className="view-all-btn" onClick={() => navigate('/sensorlogs')}>
                                    View All Sensor Kits
                                </button>
                            </div>
                        </div>

                        <div className="kpi-card">
                            <h4 className="kpi-card-title">
                                <FaUsers color="#2196F3" size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
                                Active Users
                            </h4>
                            <h2 className="kpi-value">{activeUsersCount.toLocaleString()}</h2>
                            <p className="kpi-trend">
                                <span className="text-green">
                                    Currently active users
                                </span>
                            </p>
                        </div>
                    </div>

                    <section className="dashboard-insights-panel" aria-labelledby="dashboard-insights-heading">
                        <div className="dashboard-insights-panel-header">
                            <h3 id="dashboard-insights-heading" className="dashboard-insights-title">
                                Prescriptive insights
                            </h3>
                            <span className="dashboard-insights-badge">Updates with live metrics</span>
                        </div>
                        <p className="dashboard-insights-lede">
                            Condensed observations derived from KPIs shown above. Exported PDFs mirror this wording at time of download.
                        </p>
                        {prescriptiveInsights.length > 0 ? (
                            <ol className="dashboard-insights-ordered-list">
                                {prescriptiveInsights.map((line, idx) => (
                                    <li key={`insight-${idx}`} className="dashboard-insights-li">
                                        {line}
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="dashboard-insights-empty">Insights will appear once registration and engagement data load.</p>
                        )}
                    </section>

                    <div id="charts-container" className="charts-container">
                        <div className="chart-card" id="chart-active-users">
                            <h3 className="chart-title">Monthly Active Users</h3>
                            {dailyActiveUsersData && dailyActiveUsersData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={dailyActiveUsersData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(46, 125, 50, 0.1)" />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fontSize: 12, fill: '#6b7280' }}
                                            axisLine={{ stroke: 'rgba(46, 125, 50, 0.2)' }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#6b7280' }}
                                            axisLine={{ stroke: 'rgba(46, 125, 50, 0.2)' }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid rgba(46, 125, 50, 0.2)',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                            labelStyle={{ color: '#374151', fontWeight: 600 }}
                                            itemStyle={{ color: '#4CAF50', fontWeight: 500 }}
                                        />
                                        <Bar
                                            dataKey="users"
                                            fill="url(#activeUsersGradient)"
                                            radius={[4, 4, 0, 0]}
                                            stroke="#4CAF50"
                                            strokeWidth={1}
                                        />
                                        <defs>
                                            <linearGradient id="activeUsersGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#66BB6A" />
                                                <stop offset="100%" stopColor="#4CAF50" />
                                            </linearGradient>
                                        </defs>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="chart-empty">
                                    <div className="chart-empty-icon">📊</div>
                                    <div className="chart-empty-text">No Active User Data</div>
                                    <div className="chart-empty-subtext">User activity data will appear here</div>
                                </div>
                            )}
                        </div>

                        <div className="chart-card" id="chart-new-users">
                            <h3 className="chart-title">Monthly New User Trend</h3>
                            {newUsersData && newUsersData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={newUsersData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="5 5" stroke="rgba(46, 125, 50, 0.1)" />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fontSize: 12, fill: '#6b7280' }}
                                            axisLine={{ stroke: 'rgba(46, 125, 50, 0.2)' }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#6b7280' }}
                                            axisLine={{ stroke: 'rgba(46, 125, 50, 0.2)' }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid rgba(46, 125, 50, 0.2)',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                            labelStyle={{ color: '#374151', fontWeight: 600 }}
                                            itemStyle={{ color: '#4CAF50', fontWeight: 500 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="newUsers"
                                            stroke="url(#newUsersGradient)"
                                            strokeWidth={3}
                                            dot={{ fill: '#4CAF50', strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6, stroke: '#4CAF50', strokeWidth: 2, fill: '#fff' }}
                                        />
                                        <defs>
                                            <linearGradient id="newUsersGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#4CAF50" />
                                                <stop offset="100%" stopColor="#66BB6A" />
                                            </linearGradient>
                                        </defs>
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="chart-empty">
                                    <div className="chart-empty-icon">📈</div>
                                    <div className="chart-empty-text">No New User Data</div>
                                    <div className="chart-empty-subtext">New user registration data will appear here</div>
                                </div>
                            )}
                        </div>

                        <div className="chart-card" id="chart-plant-types">
                            <h3 className="chart-title">Hydroponic Plant Types Distribution</h3>
                            {plantTypeDistribution && plantTypeDistribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid rgba(46, 125, 50, 0.2)',
                                                borderRadius: '8px',
                                            }}
                                        />
                                        <Pie
                                            data={plantTypeDistribution.map((p) => ({ name: p.name, value: p.count }))}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={88}
                                            label={({ name, percent }) =>
                                                `${name ?? ''} ${typeof percent === 'number' ? (percent * 100).toFixed(0) : '0'}%`
                                            }
                                        >
                                            {plantTypeDistribution.map((_, i) => (
                                                <Cell key={i} fill={PLANT_CHART_COLORS[i % PLANT_CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="chart-empty">
                                    <div className="chart-empty-icon">🌱</div>
                                    <div className="chart-empty-text">No Plant Type Data</div>
                                    <div className="chart-empty-subtext">Linked sensor kits with plant names will appear here</div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            )}


            {/* All Report Tickets Modal - Remade */}
            {showReportsModal && (
                <div className="reports-modal-overlay" onClick={() => setShowReportsModal(false)}>
                    <div className="reports-modal-container" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="reports-modal-header">
                            <div className="reports-modal-title">
                                <FaMicrochip className="reports-modal-icon" />
                                <h2>All Report Tickets</h2>
                                <span className="reports-modal-count">({allReportTickets.length})</span>
                            </div>
                            <div className="reports-modal-actions">
                                <button
                                    className="reports-refresh-btn"
                                    onClick={fetchReportTickets}
                                    disabled={reportsLoading}
                                >
                                    <FaRedo className={reportsLoading ? 'spinning' : ''} />
                                    {reportsLoading ? 'Loading...' : 'Refresh'}
                                </button>
                                <button
                                    className="reports-close-btn"
                                    onClick={() => setShowReportsModal(false)}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="reports-modal-body">
                            {reportsLoading ? (
                                <div className="reports-loading">
                                    <div className="reports-loading-spinner"></div>
                                    <p>Loading report tickets...</p>
                                </div>
                            ) : allReportTickets.length > 0 ? (
                                <div className="reports-table-container">
                                    <table className="reports-table">
                                        <thead className="reports-table-header">
                                            <tr>
                                                <th className="col-ticket-id">Ticket ID</th>
                                                <th className="col-message">Message</th>
                                                <th className="col-type">Type</th>
                                                <th className="col-user">User ID</th>
                                                <th className="col-datetime">Date & Time</th>
                                                <th className="col-image">Image</th>
                                                <th className="col-actions">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="reports-table-body">
                                            {allReportTickets.map((ticket) => (
                                                <tr key={ticket.id} className="reports-table-row">
                                                    <td className="col-ticket-id">
                                                        <div className="ticket-id-wrapper">
                                                            <FaMicrochip className="ticket-icon" />
                                                            <span className="ticket-id">{ticket.id}</span>
                                                        </div>
                                                    </td>
                                                    <td className="col-message">
                                                        <div className="message-wrapper" title={ticket.fullMessage || ticket.title}>
                                                            <span className="message-text">
                                                                {ticket.title.length > 80 ? ticket.title.substring(0, 80) + '...' : ticket.title}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="col-type">
                                                        <span className={`type-badge type-${ticket.type.toLowerCase().replace(/\s+/g, '-')}`}>
                                                            {ticket.type}
                                                        </span>
                                                    </td>
                                                    <td className="col-user">
                                                        <div className="user-id-wrapper" title={ticket.fullUserId || ticket.userId}>
                                                            <span className="user-id">{ticket.userId.substring(0, 12)}...</span>
                                                        </div>
                                                    </td>
                                                    <td className="col-datetime">
                                                        <div className="datetime-wrapper">
                                                            <div className="date">{ticket.timestamp.toLocaleDateString()}</div>
                                                            <div className="time">{ticket.timestamp.toLocaleTimeString()}</div>
                                                        </div>
                                                    </td>
                                                    <td className="col-image">
                                                        <div className="image-indicator">
                                                            {ticket.imageUrl ? (
                                                                <span className="has-image" title="Has attachment">📷</span>
                                                            ) : (
                                                                <span className="no-image" title="No attachment">—</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="col-actions">
                                                        <div className="action-buttons">
                                                            <button
                                                                className={`action-btn ${ticket.type.toLowerCase().includes('resolved') ? 'resolved-btn' : 'resolve-btn'}`}
                                                                onClick={() => {
                                                                    if (ticket.type.toLowerCase().includes('resolved')) {
                                                                        alert('This ticket has already been resolved!');
                                                                    } else {
                                                                        alert('Mark as resolved - Feature coming soon!');
                                                                    }
                                                                }}
                                                                aria-label={ticket.type.toLowerCase().includes('resolved') ? 'Ticket already resolved' : 'Mark ticket as resolved'}
                                                            >
                                                                {ticket.type.toLowerCase().includes('resolved') ? (
                                                                    <>
                                                                        <FaCheck /> Resolved
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <FaCheck /> Resolve
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="reports-empty-state">
                                    <FaMicrochip className="empty-icon" />
                                    <h3>No Report Tickets Found</h3>
                                    <p>There are currently no report tickets to display.</p>
                                    <button
                                        className="refresh-empty-btn"
                                        onClick={fetchReportTickets}
                                    >
                                        <FaRedo /> Refresh
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="reports-modal-footer">
                            <div className="footer-info">
                                <span>Total: {allReportTickets.length} ticket{allReportTickets.length !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Confirmation Modal */}
            {showPrintConfirmModal && (
                <div className="modal-overlay" onClick={handlePrintCancel}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Confirm Print Dashboard Summary</h3>
                            <button className="close-modal-btn" onClick={handlePrintCancel} aria-label="Close print confirmation modal">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to print the dashboard summary?</p>
                            <p style={{ fontSize: '14px', color: '#555', marginTop: '10px' }}>
                                This will generate a PDF file with all dashboard data and charts.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={handlePrintCancel}>
                                <FaTimes style={{ marginRight: 4 }} /> Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handlePrintConfirm}
                                style={{
                                    background: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    marginLeft: '10px'
                                }}
                            >
                                Print Summary
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Download Success Modal */}
            {showDownloadSuccessModal && (
                <div className="success-popup-overlay">
                    <div className="success-popup">
                        <div className="success-icon">
                            <FaCheck />
                        </div>
                        <h3>Report Generated!</h3>
                        <p>Dashboard summary has been opened in a new tab.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;