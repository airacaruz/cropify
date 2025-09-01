import { onAuthStateChanged } from 'firebase/auth';
import { collection, getCountFromServer, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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

// Icons
const Users = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
);
const Package = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7.5 4.27 9 5.15"/>
        <path d="m21 8.62-9-5.15-9 5.15 9 5.15 9-5.15Z"/>
        <path d="M3.5 12.27v6.88l8.5 4.88 8.5-4.88v-6.88"/>
        <path d="M12 22.27V12.27"/>
    </svg>
);

const DashboardCard = ({ title, value, icon, bgColorClass, textColorClass }) => {
    return (
        <div className={`dashboard-overview-card ${bgColorClass} ${textColorClass}`}>
            <div>
                <h3 className="dashboard-overview-card-title">{title}</h3>
                <p className="dashboard-overview-card-value">{value}</p>
            </div>
            {icon && React.cloneElement(icon, { className: "dashboard-overview-card-icon" })}
        </div>
    );
};

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [adminName, setAdminName] = useState("");

    const [totalUsers, setTotalUsers] = useState("...");
    const [totalActiveUsers, setTotalActiveUsers] = useState("...");

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
                fetchDashboardData();
                fetchAnalyticsData();
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const fetchTotalUsersFromFirestore = async () => {
        try {
            const usersCollectionRef = collection(db, "users");
            const totalSnapshot = await getCountFromServer(usersCollectionRef);
            setTotalUsers(totalSnapshot.data().count.toLocaleString());
        } catch (error) {
            console.error("Error fetching total users from Firestore:", error);
            setTotalUsers("Error");
        }
    };

    const fetchTotalActiveUsersFromFirestore = async () => {
        try {
            const sessionLogs = collection(db, 'user_logs_UserSessions');
            const snapshot = await getDocs(sessionLogs);

            const uniqueUsers = new Set();
            snapshot.forEach((doc) => {
                const log = doc.data();
                const userId = log.userId;
                if (userId) uniqueUsers.add(userId);
            });
            setTotalActiveUsers(uniqueUsers.size.toLocaleString());
        } catch (error) {
            console.error('Error fetching total active users:', error);
            setTotalActiveUsers("Error");
        }
    };

    // 🔹 Fetch "New Users (Current Month)" + "Active Users (All Time)" from AnalyticsPage logic
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

    const fetchDashboardData = async () => {
        await fetchTotalUsersFromFirestore();
        await fetchTotalActiveUsersFromFirestore();
    };

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

            <main className="dashboard-main-content">
                {/* Dashboard Cards */}
                <div className="dashboard-overview-grid">
                    <DashboardCard
                        title="Total Users"
                        value={totalUsers}
                        icon={<Users />}
                        bgColorClass="bg-green-primary"
                        textColorClass="text-white"
                    />
                    <DashboardCard
                        title="Total Active Users"
                        value={totalActiveUsers}
                        icon={<Package />}
                        bgColorClass="bg-green-secondary"
                        textColorClass="text-gray-800"
                    />
                </div>

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

                    <div className="charts-container">
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
                </div>

                {/* Recent Activities and Top Users Sections */}
                <div className="dashboard-data-sections-grid">
                    {/* Add your recent activities or top users here */}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
