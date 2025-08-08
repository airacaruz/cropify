import React, { useState, useEffect } from 'react';
import { db, analytics } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import '../../styles/AnalyticsPage.css';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function AnalyticsPage() {
  const [newUsersData, setNewUsersData] = useState([]);
  const [dailyActiveUsersData, setDailyActiveUsersData] = useState([]);
  const [kpiData, setKpiData] = useState({
    newUsersCount: 0,
    newUsersTrend: '0%',
  });
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    logEvent(analytics, 'page_view', {
      page_title: 'AnalyticsPage',
      page_location: window.location.href,
    });

    const fetchNewUsers = async () => {
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

        const orderedMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartData = orderedMonths.map((month) => ({
          month,
          newUsers: userCountsByMonth[month] || 0,
        }));

        const currentMonthIndex = new Date().getMonth();
        const lastMonthCount = chartData[currentMonthIndex]?.newUsers || 0;
        const prevMonthCount = chartData[currentMonthIndex - 1]?.newUsers || 0;
        const trend =
          prevMonthCount === 0 ? '0%' : `${(((lastMonthCount - prevMonthCount) / prevMonthCount) * 100).toFixed(0)}%`;

        setNewUsersData(chartData);
        setKpiData({
          newUsersCount: lastMonthCount,
          newUsersTrend: trend,
        });

        logEvent(analytics, 'new_user_kpi', {
          count: lastMonthCount,
          trend,
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const sessionLogs = collection(db, 'user_logs_UserSessions');
        const snapshot = await getDocs(sessionLogs);

        const monthlyUserMap = {};

        snapshot.forEach((doc) => {
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

          if (!monthlyUserMap[monthYear]) {
            monthlyUserMap[monthYear] = new Set();
          }

          monthlyUserMap[monthYear].add(userId);
        });

        // Get all months in the year(s) present in data for consistent x-axis
        // First, find range of years in data
        const years = new Set();
        Object.keys(monthlyUserMap).forEach((monthYear) => {
          const year = parseInt(monthYear.split(' ')[1], 10);
          years.add(year);
        });
        const orderedYears = Array.from(years).sort();

        const orderedMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Prepare full month-year combinations with zero users where no data exists
        const fullMonthYearList = [];
        orderedYears.forEach((year) => {
          orderedMonths.forEach((month) => {
            fullMonthYearList.push(`${month} ${year}`);
          });
        });

        const monthlyActiveUsersArray = fullMonthYearList.map((monthYear) => {
  const [month] = monthYear.split(' ');
  return {
    month,
    users: monthlyUserMap[monthYear] ? monthlyUserMap[monthYear].size : 0,
  };
});


        // Sort by date to be safe (though it's already ordered by construction)
        monthlyActiveUsersArray.sort((a, b) => {
          const [aMonth, aYear] = a.month.split(' ');
          const [bMonth, bYear] = b.month.split(' ');
          const aDate = new Date(`${aMonth} 1, ${aYear}`);
          const bDate = new Date(`${bMonth} 1, ${bYear}`);
          return aDate - bDate;
        });

        setDailyActiveUsersData(monthlyActiveUsersArray);

        // Count unique users overall in snapshot
        setActiveUsersCount(new Set(snapshot.docs.map((d) => d.data().userId)).size);
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    fetchNewUsers();
    fetchActiveUsers();
  }, []);

  console.log('Monthly Active Users:', dailyActiveUsersData);

  return (
    <div className="analytics-page-container">
      <div className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </div>

      <h2>Analytics</h2>

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
          <p className="kpi-context">Track your monthly user growth</p>
        </div>

        <div className="kpi-card">
          <h4 className="kpi-card-title">Active Users (All Time)</h4>
          <h1 className="kpi-value">{activeUsersCount.toLocaleString()}</h1>
          <p className="kpi-trend text-blue">Unique user sessions tracked</p>
          <p className="kpi-context">Based on login sessions per user</p>
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
  );
}

export default AnalyticsPage;
