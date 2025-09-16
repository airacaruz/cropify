import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect, useState } from 'react';
import {
    FaCloudRain,
    FaCloudSun,
    FaTemperatureHigh,
    FaTint,
    FaWater
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
import LogoutButton from '../../components/LogoutButton';
import Navbar from '../../components/Navbar';
import { auth, db } from '../../firebase';
import '../../styles/DashboardPage.css';

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
    totalUsers,
    prescriptiveInsights,
    sensorKpiCards,
    sensorChartData,
    plantTypeData
}) => {
    const doc = new jsPDF();

    async function getChartImage(chartId) {
        const chartElement = document.getElementById(chartId);
        if (chartElement) {
            const canvas = await html2canvas(chartElement);
            return canvas.toDataURL('image/png');
        }
        return null;
    }

    const chartList = [
        { id: 'chart-ph', title: 'pH Over Time' },
        { id: 'chart-tds', title: 'TDS (ppm) Over Time' },
        { id: 'chart-water-temp', title: 'Water Temperature (°C) Over Time' },
        { id: 'chart-humidity', title: 'Humidity (%) Over Time' },
        { id: 'chart-plant-types', title: 'Hydroponic Plant Types Distribution' },
    ];

    const chartImages = [];
    for (let i = 0; i < chartList.length; i++) {
        const img = await getChartImage(chartList[i].id);
        chartImages.push({ ...chartList[i], img });
    }

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

    doc.addPage();
    doc.setFontSize(18);
    doc.text('Prescriptive Insights', 14, 18);
    doc.setFontSize(12);
    prescriptiveInsights.forEach((insight, idx) => {
        doc.text(`- ${insight}`, 16, 28 + idx * 10);
    });

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

    doc.text('Sensor Data Sessions:', 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 14,
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

    // Skipped Monthly New User Acquisition table as requested

    // Add plant type pie chart results as a table
    doc.text('Hydroponic Plant Types Distribution:', 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 14,
        head: [['Plant Type', 'Count']],
        body: plantTypeData.map(row => [row.name, row.value]),
        theme: 'grid',
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
    });

    const plantTypeChart = chartImages.find(chart => chart.id === 'chart-plant-types');
    if (plantTypeChart && plantTypeChart.img) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const chartHeight = 65;
        const chartWidth = pageWidth - 30;
        let y = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(12);
        doc.addImage(plantTypeChart.img, 'PNG', 14, y + 4, chartWidth, chartHeight);
    }

    doc.save('Cropify_Prescriptive_Report.pdf');
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
    const [actionsOpen, setActionsOpen] = useState(false);
    const navigate = useNavigate();

    const [newUsersData, setNewUsersData] = useState([]);
    const [dailyActiveUsersData, setDailyActiveUsersData] = useState([]);
    const [kpiData, setKpiData] = useState({ newUsersCount: 0, newUsersTrend: '0%' });
    const [activeUsersCount, setActiveUsersCount] = useState(0);

    const [sensorSessions, setSensorSessions] = useState([]);
    const [plantTypeData, setPlantTypeData] = useState([]);

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

        } catch {
            setSensorSessions(hardcodedSessions);
            setPlantTypeData(hardcodedPlantTypes);
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

    const latestSensor = sensorChartData[sensorChartData.length - 1] || {};
    const sensorKpiCards = [
        {
            title: "Latest pH",
            value: latestSensor.ph ?? "—",
            context: "Most recent pH reading",
            icon: <FaTint color="#4CAF50" size={24} />,
        },
        {
            title: "Latest TDS (ppm)",
            value: latestSensor.tds ?? "—",
            context: "Most recent TDS reading",
            icon: <FaWater color="#2196F3" size={24} />,
        },
        {
            title: "Latest Water Temp (°C)",
            value: latestSensor.waterTemp ?? "—",
            context: "Most recent water temperature",
            icon: <FaTemperatureHigh color="#FF9800" size={24} />,
        },
        {
            title: "Latest Air Temp (°C)",
            value: latestSensor.airTemp ?? "—",
            context: "Most recent air temperature",
            icon: <FaCloudSun color="#F44336" size={24} />,
        },
        {
            title: "Latest Humidity (%)",
            value: latestSensor.humidity ?? "—",
            context: "Most recent humidity reading",
            icon: <FaCloudRain color="#009688" size={24} />,
        },
    ];

    return (
        <div className="dashboard-container">
            <Navbar role={role} />

            <header className="dashboard-topbar">
                <h2 className="dashboard-main-title">Dashboard</h2>
                <div className="dashboard-profile-actions">
                    {(role === "superadmin" || role === "admin") && (
                        <div className="dashboard-actions">
                            <button
                                className="actions-toggle"
                                onClick={() => setActionsOpen((prev) => !prev)}
                            >
                                Print Dashboard Summary ▾
                            </button>
                            {actionsOpen && (
                                <div className="actions-menu">
                                    <button
                                        className="actions-item"
                                        onClick={() =>
                                            exportChartsAndPrescriptivePDF({
                                                kpiData,
                                                totalUsers: "...",
                                                prescriptiveInsights,
                                                sensorKpiCards,
                                                sensorChartData,
                                                plantTypeData
                                            })
                                        }
                                    >
                                        Export to PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <span className="dashboard-admin-name">
                        {adminName}
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
                    <div className="kpi-cards-container">
                        {sensorKpiCards.map((kpi, idx) => (
                            <div className="kpi-card" key={idx}>
                                <h4 className="kpi-card-title">
                                    {kpi.icon}
                                    <span style={{ marginLeft: 8 }}>{kpi.title}</span>
                                </h4>
                                <h1 className="kpi-value">{kpi.value}</h1>
                                <p className="kpi-context">{kpi.context}</p>
                            </div>
                        ))}
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

                        <div className="chart-card pie-card-layout" id="chart-plant-types">
                            <div>
                                <h2 className="chart-title">Hydroponic Plant Types Distribution</h2>
                                <p className="chart-summary">
                                    Distribution of hydroponic plant types input by users.
                                </p>
                            </div>
                            <div className="pie-center">
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
                            <div className="pie-list">
                                <h3 style={{ marginBottom: 10 }}>Plant Types</h3>
                                <ul style={{ listStyle: "none", padding: 0 }}>
                                    {plantTypeData.map((entry, idx) => (
                                        <li key={entry.name} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    width: 16,
                                                    height: 16,
                                                    background: COLORS[idx % COLORS.length],
                                                    borderRadius: "50%",
                                                    marginRight: 8,
                                                }}
                                            ></span>
                                            <span style={{ fontWeight: 500 }}>{entry.name}</span>
                                            <span style={{ marginLeft: "auto", fontWeight: 700 }}>{entry.value}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
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
                        
                    </div>

                    
                </div>
            )}
        </div>
    );
};

export default Dashboard;