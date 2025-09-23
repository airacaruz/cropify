import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect, useState } from 'react';
import {
    FaMicrochip,
    FaPlus,
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
import { auth, db } from '../../firebase';
import '../../styles/DashboardPage.css';
import { adminAuditActions } from '../../utils/adminAuditLogger';

function getPrescriptiveInsights(kpiData, newUsersData, activeUsersCount, totalUsers) {
    const insights = [];
    if (parseFloat(kpiData.newUsersTrend) < 0) {
        insights.push("New user growth is down this month. Consider launching a referral or marketing campaign.");
    } else if (parseFloat(kpiData.newUsersTrend) > 10) {
        insights.push("New user growth is strong! Analyze what worked this month and replicate it.");
    } else {
        insights.push("New user growth is steady. Continue monitoring.");
    }
    if (totalUsers !== "..." && !isNaN(activeUsersCount) && parseInt(totalUsers.replace(/,/g, '')) > 0) {
        const activeRatio = activeUsersCount / parseInt(totalUsers.replace(/,/g, ''));
        if (activeRatio > 0.7) {
            insights.push("A high percentage of users are active. Consider advanced features or loyalty rewards.");
        } else if (activeRatio < 0.3) {
            insights.push("Active user rate is low. Try re-engagement campaigns.");
        }
    }
    if (newUsersData.length > 0) {
        const highest = newUsersData.reduce((prev, curr) => (curr.newUsers > prev.newUsers ? curr : prev));
        insights.push(`Highest new user growth was in ${highest.month}. Review your activities then for best practices.`);
    }
    return insights;
}

const exportChartsAndPrescriptivePDF = async ({
    kpiData,
    newUsersData,
    totalUsers,
    prescriptiveInsights,
    sensorChartData,
    plantTypeData
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
        ['New Users (Current Month)', kpiData.newUsersCount || '0', kpiData.newUsersTrend || 'N/A', 'Active'],
        ['Total Users', totalUsers || 'N/A', 'Growing', 'Good'],
        ['Active Users', 'N/A', 'Stable', 'Good'],
        ['Sensor Sessions', sensorChartData.length.toString(), 'Active', 'Good'],
        ['Plant Types Tracked', plantTypeData.length.toString(), 'Diverse', 'Good']
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
        const avgMonthlyGrowth = (totalNewUsers / newUsersData.length).toFixed(1);
        const highestMonth = newUsersData.reduce((max, month) => month.newUsers > max.newUsers ? month : max, newUsersData[0]);
        
        doc.setFontSize(12);
        doc.text('Monthly User Growth Analysis:', margin, yPosition);
        yPosition += 10;
        
        const growthMetrics = [
            `• Total new users tracked: ${totalNewUsers}`,
            `• Average monthly growth: ${avgMonthlyGrowth} users`,
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
            `${((month.newUsers / totalNewUsers) * 100).toFixed(1)}%`,
            month.newUsers > avgMonthlyGrowth ? 'Above Avg' : 'Below Avg'
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
        
        // Enhanced sensor data table (showing first 15 records)
        const sensorTableData = sensorChartData.slice(0, 15).map(session => [
            new Date(session.timestamp).toLocaleDateString(),
            session.ph.toFixed(2),
            session.tds.toString(),
            `${session.waterTemp.toFixed(1)}°C`,
            `${session.airTemp.toFixed(1)}°C`,
            `${session.humidity.toFixed(1)}%`
        ]);
        
        autoTable(doc, {
            head: [['Date', 'pH', 'TDS (ppm)', 'Water Temp', 'Air Temp', 'Humidity']],
            body: sensorTableData,
            startY: yPosition,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        if (sensorChartData.length > 15) {
            yPosition = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`* Showing first 15 of ${sensorChartData.length} total sensor readings`, 20, yPosition);
        }
        
        yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Add Plant Type Distribution Section
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.text('Hydroponic Plant Type Distribution', margin, yPosition);
    yPosition += 15;
    
    if (plantTypeData && plantTypeData.length > 0) {
        const totalPlants = plantTypeData.reduce((sum, p) => sum + p.value, 0);
        const mostPopular = plantTypeData.reduce((max, plant) => plant.value > max.value ? plant : max, plantTypeData[0]);
        
        doc.setFontSize(12);
        doc.text('Plant Type Analysis:', 20, yPosition);
        yPosition += 10;
        
        const plantMetrics = [
            `• Total plants tracked: ${totalPlants}`,
            `• Number of different plant types: ${plantTypeData.length}`,
            `• Most popular plant: ${mostPopular.name} (${mostPopular.value} plants, ${((mostPopular.value / totalPlants) * 100).toFixed(1)}%)`,
            `• Plant diversity index: ${plantTypeData.length > 1 ? 'High' : 'Low'}`
        ];
        
        plantMetrics.forEach(metric => {
            doc.text(metric, 25, yPosition);
            yPosition += 7;
        });
        
        yPosition += 10;
        
        // Enhanced plant type table
        const plantTableData = plantTypeData.map(plant => [
            plant.name,
            plant.value.toString(),
            `${((plant.value / totalPlants) * 100).toFixed(1)}%`,
            plant.value === mostPopular.value ? 'Most Popular' : 'Standard'
        ]);
        
        autoTable(doc, {
            head: [['Plant Type', 'Count', 'Percentage', 'Status']],
            body: plantTableData,
            startY: yPosition,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [76, 175, 80] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        
        yPosition = doc.lastAutoTable.finalY + 20;
    }

    // Add Prescriptive Insights Section
    doc.setFontSize(16);
    doc.text('Prescriptive Insights & Recommendations', 20, yPosition);
    yPosition += 15;
    
    if (prescriptiveInsights && prescriptiveInsights.length > 0) {
        doc.setFontSize(11);
        prescriptiveInsights.forEach((insight) => {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 30;
            }
            doc.text(`• ${insight}`, 20, yPosition);
            yPosition += 8;
        });
    } else {
        doc.setFontSize(11);
        doc.text('• Continue monitoring user growth trends for optimal resource allocation', 20, yPosition);
        yPosition += 8;
        doc.text('• Maintain current sensor monitoring practices for system health', 20, yPosition);
        yPosition += 8;
        doc.text('• Consider expanding plant type diversity based on user preferences', 20, yPosition);
    }
    
    yPosition += 20;

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

    doc.save('Cropify_Dashboard_Analytics_Report.pdf');
};

const hardcodedPlantTypes = [
    { name: "Lettuce", value: 4 },
    { name: "Tomato", value: 1 }
];
const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#009688', '#9C27B0'];

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

    const [sensorSessions, setSensorSessions] = useState([]);
    const [plantTypeData, setPlantTypeData] = useState([]);
    const [showSensorKitsModal, setShowSensorKitsModal] = useState(false);
    const [showReportsModal, setShowReportsModal] = useState(false);
    const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
    const [reportTickets, setReportTickets] = useState([]);
    const [allReportTickets, setAllReportTickets] = useState([]);

    const handlePrintConfirm = async () => {
        // Log the print dashboard action
        if (uid && adminName) {
            await adminAuditActions.printDashboard(uid, adminName);
        }
        
        exportChartsAndPrescriptivePDF({
            kpiData,
            newUsersData,
            totalUsers: "...",
            prescriptiveInsights,
            sensorChartData,
            plantTypeData
        });
        setShowPrintConfirmModal(false);
    };

    const handlePrintCancel = () => {
        setShowPrintConfirmModal(false);
    };

    const hardcodedSessions = [
        {
            id: 'demo1',
            timestamp: '2024-06-01T08:00:00',
            ph: 6.8,
            tds: 750,
            waterTemp: 22,
            airTemp: 27,
            humidity: 60,
        },
        {
            id: 'demo2',
            timestamp: '2024-06-02T08:00:00',
            ph: 7.0,
            tds: 800,
            waterTemp: 23,
            airTemp: 28,
            humidity: 65,
        },
        {
            id: 'demo3',
            timestamp: '2024-06-03T08:00:00',
            ph: 6.7,
            tds: 780,
            waterTemp: 21,
            airTemp: 26,
            humidity: 63,
        },
    ];

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
                fetchAnalyticsData();
            }
        };

        fetchRole();
    }, [uid]);

    const fetchAnalyticsData = async () => {
        try {
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

            const orderedMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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
            setActiveUsersCount(new Set(logSnapshot.docs.map((d) => d.data().userId)).size);

            // Fetch sensor sessions from Firestore
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
            const allSessions = [...sessions, ...hardcodedSessions];
            allSessions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            setSensorSessions(allSessions);

            // Fetch plant types for pie chart
            const plantSnapshot = await getDocs(collection(db, 'plants'));
            const typeCounts = {};
            plantSnapshot.forEach(doc => {
                const kind = doc.data().kind || 'Unknown';
                typeCounts[kind] = (typeCounts[kind] || 0) + 1;
            });
            hardcodedPlantTypes.forEach(hard => {
                typeCounts[hard.name] = (typeCounts[hard.name] || 0) + hard.value;
            });
            const pieData = Object.entries(typeCounts).map(([kind, count]) => ({
                name: kind,
                value: count,
            }));
            setPlantTypeData(pieData);

            // Fetch report tickets from Firestore
            const reportsSnapshot = await getDocs(collection(db, 'reports'));
            const reports = reportsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.message || 'No title',
                    type: data.type || 'Unknown',
                    userId: data.userId || 'Unknown',
                    timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
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
            
            console.log('Fetched report tickets:', sortedReports.length, 'total reports');

        } catch (error) {
            console.error('Error fetching analytics data:', error);
            setSensorSessions(hardcodedSessions);
            setPlantTypeData(hardcodedPlantTypes);
            setReportTickets([]);
        }
    };

    const prescriptiveInsights = getPrescriptiveInsights(kpiData, newUsersData, activeUsersCount, "...");

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
                    <div className="kpi-cards-container">
                        <div className="kpi-card">
                                <h4 className="kpi-card-title">
                                <FaUserPlus color="#4CAF50" size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
                                New Users (Current Month)
                                </h4>
                            <h1 className="kpi-value">{kpiData.newUsersCount.toLocaleString()}</h1>
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
                                    <FaMicrochip color="#FF9800" size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
                                    App Report Tickets
                                </h4>
                            </div>
                            <div className="app-reports-list">
                                {reportTickets.length > 0 ? (
                                    reportTickets.map((ticket) => (
                                        <div key={ticket.id} className="app-report-item">
                                            <div className="ticket-info">
                                                <span className="ticket-id">{ticket.id}</span>
                                                <span className="ticket-title">{ticket.title}</span>
                                            </div>
                                            <div className="ticket-details">
                                                <span className={`ticket-status ${ticket.type.toLowerCase().replace(' ', '-')}`}>
                                                    {ticket.type}
                                                </span>
                                                <span className="ticket-user">
                                                    {ticket.userId.substring(0, 8)}...
                                                </span>
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
                                    <FaMicrochip color="#2196F3" size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
                                    Recent Sensor Kits
                                </h4>
                                <button className="quick-add-btn" onClick={() => alert('Quick Add Sensor Kit - Feature coming soon!')}>
                                    <FaPlus size={16} /> Quick Add
                                </button>
                            </div>
                            <div className="sensor-kits-list">
                                {[
                                    { id: 'SK-001', status: 'Active', user: 'user123' },
                                    { id: 'SK-002', status: 'Inactive', user: 'user456' }
                                ].map((kit) => (
                                    <div key={kit.id} className="sensor-kit-item">
                                        <div className="kit-info">
                                            <span className="kit-id">{kit.id}</span>
                                            <span className={`kit-status ${kit.status.toLowerCase()}`}>
                                                {kit.status}
                                            </span>
                                        </div>
                                        <span className="kit-user">{kit.user}</span>
                            </div>
                        ))}
                    </div>
                            <div className="view-all-container">
                                <button className="view-all-btn" onClick={() => setShowSensorKitsModal(true)}>
                                    View All Sensor Kits
                                </button>
                            </div>
                    </div>

                        <div className="kpi-card">
                            <h4 className="kpi-card-title">
                                <FaUsers color="#2196F3" size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
                                Active Users
                            </h4>
                            <h1 className="kpi-value">{activeUsersCount.toLocaleString()}</h1>
                            <p className="kpi-trend">
                                <span className="text-green">
                                    Currently active users
                                </span>
                            </p>
                        </div>
                    </div>

                    <div id="charts-container" className="charts-container">
                        <div className="chart-card" id="chart-active-users">
                            <h2 className="chart-title">Monthly Active Users</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dailyActiveUsersData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="users" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card pie-chart-main-card" id="chart-plant-types">
                                <h2 className="chart-title">Hydroponic Plant Types Distribution</h2>
                                <p className="chart-summary">
                                    Distribution of hydroponic plant types input by users.
                                </p>
                            <div className="pie-chart-container">
                                <div className="pie-chart-wrapper">
                                <PieChart width={300} height={300}>
                                    <Pie
                                        data={plantTypeData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label
                                    >
                                        {plantTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </div>
                                <div className="plant-types-card">
                                    <div className="plant-types-header">
                                        <h3>Plant Types</h3>
                                        <span className="total-count">
                                            Total: {plantTypeData.reduce((sum, item) => sum + item.value, 0)}
                                        </span>
                                    </div>
                                    <div className="plant-types-list">
                                    {plantTypeData.map((entry, idx) => (
                                            <div key={entry.name} className="plant-type-item">
                                                <div className="plant-type-info">
                                            <span
                                                        className="plant-type-color"
                                                style={{
                                                    background: COLORS[idx % COLORS.length],
                                                }}
                                            ></span>
                                                    <span className="plant-type-name">{entry.name}</span>
                                                </div>
                                                <span className="plant-type-count">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="chart-card" id="chart-new-users">
                            <h2 className="chart-title">Monthly New User Trend</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={newUsersData}>
                                    <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="newUsers"
                                        stroke="#4CAF50"
                                        strokeWidth={3}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        </div>
                        
                        </div>
            )}

            {/* Sensor Kits Modal */}
            {showSensorKitsModal && (
                <div className="modal-overlay" onClick={() => setShowSensorKitsModal(false)}>
                    <div className="modal-content sensor-kits-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                <FaMicrochip style={{ marginRight: 8, color: "#2196F3" }} />
                                All Sensor Kits
                            </h3>
                            <button 
                                className="close-modal-btn" 
                                onClick={() => setShowSensorKitsModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="sensor-kits-table">
                                <table className="modal-table">
                                    <thead>
                                        <tr>
                                            <th>Kit ID</th>
                                            <th>Status</th>
                                            <th>User ID</th>
                                            <th>Last Activity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { id: 'SK-001', status: 'Active', user: 'user123', lastActivity: '2024-01-15 14:30' },
                                            { id: 'SK-002', status: 'Inactive', user: 'user456', lastActivity: '2024-01-14 09:15' }
                                        ].map((kit) => (
                                            <tr key={kit.id}>
                                                <td>
                                                    <span className="kit-id-badge">
                                                        <FaMicrochip size={12} style={{ marginRight: 4 }} />
                                                        {kit.id}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${kit.status.toLowerCase()}`}>
                                                        {kit.status}
                                                    </span>
                                                </td>
                                                <td>{kit.user}</td>
                                                <td>{kit.lastActivity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="add-kit-btn"
                                onClick={() => alert('Add New Sensor Kit - Feature coming soon!')}
                            >
                                <FaPlus size={14} style={{ marginRight: 6 }} />
                                Add New Sensor Kit
                            </button>
                            <button 
                                className="close-modal-btn-secondary"
                                onClick={() => setShowSensorKitsModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    </div>
            )}

            {/* Report Tickets Modal */}
            {showReportsModal && (
                <div className="modal-overlay" onClick={() => setShowReportsModal(false)}>
                    <div className="modal-content reports-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                <FaMicrochip style={{ marginRight: 8, color: "#FF9800" }} />
                                All Report Tickets ({allReportTickets.length})
                            </h3>
                            <button 
                                className="close-modal-btn" 
                                onClick={() => setShowReportsModal(false)}
                            >
                                <FaTimes />
                            </button>
                    </div>
                        <div className="modal-body">
                            <div className="reports-table">
                                <table className="modal-table">
                                    <thead>
                                        <tr>
                                            <th>Ticket ID</th>
                                            <th>Message</th>
                                            <th>Type</th>
                                            <th>User ID</th>
                                            <th>Date & Time</th>
                                            <th>Image</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allReportTickets.length > 0 ? (
                                            allReportTickets.map((ticket) => (
                                                <tr key={ticket.id}>
                                                    <td>
                                                        <span className="ticket-id-badge">
                                                            <FaMicrochip size={12} style={{ marginRight: 4 }} />
                                                            {ticket.id}
                                                        </span>
                                                    </td>
                                                    <td className="ticket-message-cell">
                                                        <span className="ticket-message-text" title={ticket.fullMessage || ticket.title}>
                                                            {ticket.title.length > 60 ? ticket.title.substring(0, 60) + '...' : ticket.title}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${ticket.type.toLowerCase().replace(' ', '-')}`}>
                                                            {ticket.type}
                                                        </span>
                                                    </td>
                                                    <td className="user-id-cell">
                                                        <span title={ticket.fullUserId || ticket.userId}>
                                                            {ticket.userId.substring(0, 15)}...
                                                        </span>
                                                    </td>
                                                    <td className="datetime-cell">
                                                        <div className="datetime-info">
                                                            <div>{ticket.timestamp.toLocaleDateString()}</div>
                                                            <div className="time-info">{ticket.timestamp.toLocaleTimeString()}</div>
                                                        </div>
                                                    </td>
                                                    <td className="image-cell">
                                                        {ticket.imageUrl ? (
                                                            <span className="has-image">📷</span>
                                                        ) : (
                                                            <span className="no-image">—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button 
                                                            className={`status-btn ${ticket.type.toLowerCase().includes('resolved') ? 'resolved' : 'pending'}`}
                                                            onClick={() => {
                                                                if (ticket.type.toLowerCase().includes('resolved')) {
                                                                    alert('This ticket has already been resolved!');
                                                                } else {
                                                                    alert('Mark as resolved - Feature coming soon!');
                                                                }
                                                            }}
                                                        >
                                                            {ticket.type.toLowerCase().includes('resolved') ? 'Resolved' : 'Mark as Resolved'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="no-data-cell">
                                                    <div className="no-tickets">
                                                        <p>No report tickets found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="close-modal-btn-secondary"
                                onClick={() => setShowReportsModal(false)}
                            >
                                Close
                            </button>
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
                            <button className="close-modal-btn" onClick={handlePrintCancel}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to print the dashboard summary?</p>
                            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
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
        </div>
    );
};

export default Dashboard;