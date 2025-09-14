import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../../components/LogoutButton';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';

import '../../styles/DashboardPage.css';

import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

// ---------------- PDF + Insights ----------------
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
    sensorKpiCards,
    sensorChartData
}) => {
    const doc = new jsPDF();

    // Helper to export chart images by element id
    async function getChartImage(chartId) {
        const chartElement = document.getElementById(chartId);
        if (chartElement) {
            const canvas = await html2canvas(chartElement);
            return canvas.toDataURL('image/png');
        }
        return null;
    }

    // List of chart IDs and titles
    const chartList = [
        { id: 'chart-new-users', title: 'Monthly New User Acquisition' },
        { id: 'chart-active-users', title: 'Monthly Active Users' },
        { id: 'chart-ph', title: 'pH Over Time' },
        { id: 'chart-tds', title: 'TDS (ppm) Over Time' },
        { id: 'chart-water-temp', title: 'Water Temperature (°C) Over Time' },
        { id: 'chart-air-temp', title: 'Air Temperature (°C) Over Time' },
        { id: 'chart-humidity', title: 'Humidity (%) Over Time' },
    ];

    // Get all chart images
    const chartImages = [];
    for (let i = 0; i < chartList.length; i++) {
        const img = await getChartImage(chartList[i].id);
        chartImages.push({ ...chartList[i], img });
    }

    // Add charts to PDF, 3 per page (pages 1 and 2)
    let chartIdx = 0;
    while (chartIdx < chartImages.length) {
        if (chartIdx > 0) doc.addPage();
        doc.setFontSize(18);
        doc.text('Dashboard Analytics Charts', 14, 18);

        const chartsOnPage = chartImages.slice(chartIdx, chartIdx + 3);
        const pageWidth = doc.internal.pageSize.getWidth();
        const chartHeight = 65;
        const chartWidth = pageWidth - 30;
        let y = 28;

        chartsOnPage.forEach((chart) => {
            doc.setFontSize(12);
            doc.text(chart.title, 14, y);
            if (chart.img) {
                doc.addImage(chart.img, 'PNG', 14, y + 4, chartWidth, chartHeight);
            }
            y += chartHeight + 18;
        });

        chartIdx += 3;
    }

    // 3rd page: Prescriptive Analytics & KPIs Tables
    doc.addPage();
    doc.setFontSize(18);
    doc.text('Prescriptive Analytics & KPIs', 14, 18);

    doc.setFontSize(14);
    doc.text('User KPIs:', 14, 28);

    autoTable(doc, {
        startY: 32,
        head: [['Metric', 'Value']],
        body: [
            ['New Users (Current Month)', kpiData.newUsersCount],
            ['New Users Trend', kpiData.newUsersTrend],
            ['Total Users', totalUsers],
        ],
        theme: 'grid',
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
    });

    doc.text('Sensor KPIs:', 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 14,
        head: [['Metric', 'Value', 'Context']],
        body: sensorKpiCards.map(card => [card.title, card.value, card.context]),
        theme: 'grid',
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
    });

    // 4th page: Sensor Data Sessions Table, then Monthly New User Acquisition Table, then the graph
    doc.addPage();
    doc.setFontSize(18);
    doc.text('Sensor Data Sessions', 14, 18);

    autoTable(doc, {
        startY: 22,
        head: [['Timestamp', 'pH', 'TDS', 'Water Temp', 'Air Temp', 'Humidity']],
        body: sensorChartData.map(row => [
            row.timestamp,
            row.ph,
            row.tds,
            row.waterTemp,
            row.airTemp,
            row.humidity
        ]),
        theme: 'grid',
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
    });

    doc.text('Monthly New User Acquisition', 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 14,
        head: [['Month', 'New Users']],
        body: newUsersData.map(row => [row.month, row.newUsers]),
        theme: 'grid',
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
    });

    // Add the Monthly New User Acquisition graph below the table
    const newUserChart = chartImages.find(chart => chart.id === 'chart-new-users');
    if (newUserChart && newUserChart.img) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const chartHeight = 65;
        const chartWidth = pageWidth - 30;
        let y = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(12);
        doc.text('Monthly New User Acquisition Trend (Graph)', 14, y);
        doc.addImage(newUserChart.img, 'PNG', 14, y + 4, chartWidth, chartHeight);
    }

    // 5th page: Prescriptive Insights
    doc.addPage();
    doc.setFontSize(18);
    doc.text('Prescriptive Insights', 14, 18);
    doc.setFontSize(12);
    prescriptiveInsights.forEach((insight, idx) => {
        doc.text(`- ${insight}`, 16, 28 + idx * 10);
    });

    doc.save('Cropify_Prescriptive_Report.pdf');
};

// ---------------- Dashboard ----------------
const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState(null); 
    const [adminName, setAdminName] = useState("");
    const [uid, setUid] = useState(null); 
    const navigate = useNavigate();

    // Analytics data
    const [newUsersData, setNewUsersData] = useState([]);
    const [dailyActiveUsersData, setDailyActiveUsersData] = useState([]);
    const [kpiData, setKpiData] = useState({ newUsersCount: 0, newUsersTrend: '0%' });
    const [activeUsersCount, setActiveUsersCount] = useState(0);

    // Sensor data state
    const [sensorSessions, setSensorSessions] = useState([]);
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
        const storedName = localStorage.getItem("adminName");
        setAdminName(storedName || "Admin");

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
                        setAdminName(data.name || "Admin");
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
            // Combine Firestore and hardcoded sessions
            const allSessions = [...sessions, ...hardcodedSessions];
            allSessions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            setSensorSessions(allSessions);

        } catch (error) {
            console.error("Error fetching analytics data:", error);
            setSensorSessions(hardcodedSessions);
        }
    };

    const prescriptiveInsights = getPrescriptiveInsights(kpiData, newUsersData, activeUsersCount, "...");

    if (loading) {
        return <div className="loading-container"><p>Loading...</p></div>;
    }

    // Prepare sensor data for charts and cards
    const sensorChartData = sensorSessions.map(session => ({
        timestamp: session.timestamp,
        ph: session.ph,
        tds: session.tds,
        waterTemp: session.waterTemp,
        airTemp: session.airTemp,
        humidity: session.humidity,
    }));

    const latestSensor = sensorChartData[sensorChartData.length - 1] || {};
    const sensorKpiCards = [
        {
            title: "Latest pH",
            value: latestSensor.ph ?? "—",
            context: "Most recent pH reading",
        },
        {
            title: "Latest TDS (ppm)",
            value: latestSensor.tds ?? "—",
            context: "Most recent TDS reading",
        },
        {
            title: "Latest Water Temp (°C)",
            value: latestSensor.waterTemp ?? "—",
            context: "Most recent water temperature",
        },
        {
            title: "Latest Air Temp (°C)",
            value: latestSensor.airTemp ?? "—",
            context: "Most recent air temperature",
        },
        {
            title: "Latest Humidity (%)",
            value: latestSensor.humidity ?? "—",
            context: "Most recent humidity reading",
        },
    ];

    // ---------------- UI ----------------
    return (
        <div className="dashboard-container">
            <Navbar role={role} />

            <header className="dashboard-topbar">
                <h2 className="dashboard-main-title">Dashboard</h2>
                <div className="dashboard-profile-actions">
                    <span className="dashboard-admin-name">
                        {adminName} ({role})
                    </span>
                    <LogoutButton />
                </div>
            </header>

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
                    {/* User KPIs */}
                    <div className="kpi-cards-container">
                        <div className="kpi-card">
                            <h4 className="kpi-card-title">New Users (Current Month)</h4>
                            <h1 className="kpi-value">{kpiData.newUsersCount.toLocaleString()}</h1>
                            <p className="kpi-trend">
                                <span className={parseFloat(kpiData.newUsersTrend) > 0 ? 'text-green' : 'text-red'}>
                                    {parseFloat(kpiData.newUsersTrend) > 0 ? '▲' : '▼'} {kpiData.newUsersTrend}
                                </span>{' '}
                                vs. last month
                            </p>
                        </div>
                        {/* Sensor KPI Cards */}
                        {sensorKpiCards.map((kpi, idx) => (
                            <div className="kpi-card" key={idx}>
                                <h4 className="kpi-card-title">{kpi.title}</h4>
                                <h1 className="kpi-value">{kpi.value}</h1>
                                <p className="kpi-context">{kpi.context}</p>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
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

                        <div className="chart-card" id="chart-ph">
                            <h2 className="chart-title">pH Over Time</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={sensorChartData}>
                                    <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
                                    <XAxis dataKey="timestamp" />
                                    <YAxis domain={['auto', 'auto']} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="ph" stroke="#4CAF50" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="chart-card" id="chart-tds">
                            <h2 className="chart-title">TDS (ppm) Over Time</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={sensorChartData}>
                                    <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
                                    <XAxis dataKey="timestamp" />
                                    <YAxis domain={['auto', 'auto']} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="tds" stroke="#2196F3" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="chart-card" id="chart-water-temp">
                            <h2 className="chart-title">Water Temperature (°C) Over Time</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={sensorChartData}>
                                    <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
                                    <XAxis dataKey="timestamp" />
                                    <YAxis domain={['auto', 'auto']} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="waterTemp" stroke="#FF9800" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="chart-card" id="chart-air-temp">
                            <h2 className="chart-title">Air Temperature (°C) Over Time</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={sensorChartData}>
                                    <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
                                    <XAxis dataKey="timestamp" />
                                    <YAxis domain={['auto', 'auto']} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="airTemp" stroke="#F44336" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="chart-card" id="chart-humidity">
                            <h2 className="chart-title">Humidity (%) Over Time</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={sensorChartData}>
                                    <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
                                    <XAxis dataKey="timestamp" />
                                    <YAxis domain={['auto', 'auto']} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="humidity" stroke="#009688" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Monthly New User Acquisition graph moved below sensor data session */}
                        <div className="chart-card" id="chart-new-users">
                            <h2 className="chart-title">Monthly New User Acquisition Trend</h2>
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

                    {/* Export PDF */}
                    <div style={{ textAlign: 'right', marginTop: '2rem' }}>
                        <button
                            style={{
                                padding: '0.5rem 1rem',
                                background: '#4CAF50',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer'
                            }}
                            onClick={() =>
                                exportChartsAndPrescriptivePDF({
                                    kpiData,
                                    newUsersData,
                                    totalUsers: "...",
                                    prescriptiveInsights,
                                    sensorKpiCards,
                                    sensorChartData
                                })
                            }
                        >
                            Export Prescriptive PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;