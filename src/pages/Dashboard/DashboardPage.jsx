import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../../components/LogoutButton';
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

function getPrescriptiveInsights(kpiData, newUsersData, activeUsersCount, totalUsers) {
    const insights = [];
    if (parseFloat(kpiData.newUsersTrend) < 0) {
        insights.push("New user growth is down this month. Consider launching a referral or marketing campaign to boost signups.");
    } else if (parseFloat(kpiData.newUsersTrend) > 10) {
        insights.push("New user growth is strong! Analyze what worked this month and replicate it in future campaigns.");
    } else {
        insights.push("New user growth is steady. Continue monitoring for any changes.");
    }
    if (totalUsers !== "..." && !isNaN(activeUsersCount) && parseInt(totalUsers.replace(/,/g, '')) > 0) {
        const activeRatio = activeUsersCount / parseInt(totalUsers.replace(/,/g, ''));
        if (activeRatio > 0.7) {
            insights.push("A high percentage of users are active. Consider introducing advanced features or loyalty rewards.");
        } else if (activeRatio < 0.3) {
            insights.push("Active user rate is low. Consider sending re-engagement emails or push notifications.");
        }
    }
    if (newUsersData.length > 0) {
        const highest = newUsersData.reduce((prev, curr) => (curr.newUsers > prev.newUsers ? curr : prev));
        insights.push(`Highest new user growth was in ${highest.month}. Review your activities during this period for best practices.`);
    }
    return insights;
}

// Merged PDF export function: charts + prescriptive
const exportChartsAndPrescriptivePDF = async ({
    kpiData,
    newUsersData,
    activeUsersCount,
    totalUsers,
    prescriptiveInsights
}) => {
    const doc = new jsPDF();

    // 1. Add Charts as Image
    const chartElement = document.getElementById('charts-container');
    if (chartElement) {
        const canvas = await html2canvas(chartElement);
        const imgData = canvas.toDataURL('image/png');
        const pageWidth = doc.internal.pageSize.getWidth();
        const imgProps = doc.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pageWidth) / imgProps.width;
        doc.setFontSize(18);
        doc.text('Dashboard Analytics Charts', 14, 18);
        doc.addImage(imgData, 'PNG', 10, 28, pageWidth - 20, imgHeight - 20);
    }

    // 2. Add Prescriptive Insights and KPIs on a new page
    doc.addPage();
    doc.setFontSize(18);
    doc.text('Prescriptive Analytics & KPIs', 14, 18);

    doc.setFontSize(12);
    doc.text('KPIs:', 14, 28);

    autoTable(doc, {
        startY: 32,
        head: [['Metric', 'Value']],
        body: [
            ['New Users (Current Month)', kpiData.newUsersCount],
            ['New Users Trend', kpiData.newUsersTrend],
            ['Active Users (All Time)', activeUsersCount],
            ['Total Users', totalUsers],
        ],
        theme: 'grid',
        styles: { fontSize: 10 },
    });

    doc.text('Monthly New User Acquisition:', 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 14,
        head: [['Month', 'New Users']],
        body: newUsersData.map(row => [row.month, row.newUsers]),
        theme: 'grid',
        styles: { fontSize: 10 },
    });

    doc.text('Prescriptive Insights:', 14, doc.lastAutoTable.finalY + 10);
    prescriptiveInsights.forEach((insight, idx) => {
        doc.text(`- ${insight}`, 16, doc.lastAutoTable.finalY + 16 + idx * 8);
    });

    doc.save('Cropify_Prescriptive_Report.pdf');
};

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [adminName, setAdminName] = useState("");

    // Analytics data
    const [newUsersData, setNewUsersData] = useState([]);
    const [dailyActiveUsersData, setDailyActiveUsersData] = useState([]);
    const [kpiData, setKpiData] = useState({
        newUsersCount: 0,
        newUsersTrend: '0%',
    });
    const [activeUsersCount, setActiveUsersCount] = useState(0);

    useEffect(() => {
        const storedName = localStorage.getItem("adminName");
        setAdminName(storedName || "Admin");

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigate('/', { replace: true });
            } else {
                setLoading(false);
                fetchAnalyticsData();
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const fetchAnalyticsData = async () => {
        try {
            // --- New Users --- 
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
            setKpiData({
                newUsersCount: lastMonthCount,
                newUsersTrend: trend,
            });

            // --- Active Users ---
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
            orderedYears.forEach((year) => {
                orderedMonths.forEach((month) => fullMonthYearList.push(`${month} ${year}`));
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

        } catch (error) {
            console.error("Error fetching analytics data:", error);
        }
    };

    const prescriptiveInsights = getPrescriptiveInsights(kpiData, newUsersData, activeUsersCount, "...");

    if (loading) {
        return (
            <div className="loading-container">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-topbar">
                <h2 className="dashboard-main-title">Dashboard</h2>
                <div className="dashboard-profile-actions">
                    <span className="dashboard-admin-name">{adminName}</span>
                    <LogoutButton />
                </div>
            </header>

            {/* Analytics Section */}
            <div className="dashboard-analytics-section">
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
                        <p className="kpi-context">*Track your monthly user growth</p>
                    </div>
                    <div className="kpi-card">
                        <h4 className="kpi-card-title">Active Users (All Time)</h4>
                        <h1 className="kpi-value">{activeUsersCount.toLocaleString()}</h1>
                        <p className="kpi-trend text-blue">Unique user sessions tracked</p>
                        <p className="kpi-context">*Based on login sessions per user</p>
                    </div>
                </div>

                {/* Charts Container for PDF Export */}
                <div id="charts-container" className="charts-container">
                    <div className="chart-card">
                        <h2 className="chart-title">Monthly New User Acquisition Trend</h2>
                        <div className="chart-placeholder">
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
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="chart-summary">
                            Highest growth was in{' '}
                            {newUsersData.length > 0
                                ? newUsersData.reduce((prev, curr) => (curr.newUsers > prev.newUsers ? curr : prev)).month
                                : 'recent months'}
                            , with {kpiData.newUsersCount.toLocaleString()} new users.
                        </p>
                    </div>

                    <div className="chart-card">
                        <h2 className="chart-title">Monthly Active Users</h2>
                        <div className="chart-placeholder">
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
                        <p className="chart-summary">This chart shows how many unique users logged in each month.</p>
                    </div>
                </div>

                {/* Merged PDF Export Button */}
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
                                activeUsersCount,
                                totalUsers: "...",
                                prescriptiveInsights
                            })
                        }
                    >
                        Export Prescriptive PDF
                    </button>
                </div>
            </div>

            <main className="dashboard-main-content">
                <div className="dashboard-data-sections-grid">
                    {/* Add your recent activities or top users here */}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;