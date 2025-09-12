import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { auth, db } from '../../firebase';
import '../../styles/AnalyticsPage.css';

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null); 
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null); 
  const navigate = useNavigate();

  // Sensor data state
  const [sensorSessions, setSensorSessions] = useState([]);

  // Example hardcoded sensor data for demo/testing
  const hardcodedSessions = [
    {
      id: 'demo1',
      timestamp: '2025-06-01T08:00:00',
      ph: 6.8,
      tds: 750,
      waterTemp: 22,
      airTemp: 27,
      humidity: 60,
    },
    {
      id: 'demo2',
      timestamp: '2025-06-02T08:00:00',
      ph: 7.0,
      tds: 800,
      waterTemp: 23,
      airTemp: 28,
      humidity: 65,
    },
    {
      id: 'demo3',
      timestamp: '2025-06-03T08:00:00',
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
        navigate("/", { replace: true });
      } else {
        setUid(user.uid);
        // Fetch role from Firestore
        const adminsRef = collection(db, "admins");
        const adminsSnapshot = await getDocs(adminsRef);
        let found = false;
        adminsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.adminId === user.uid) {
            setRole(data.role || "unknown");
            setAdminName(data.name || "Admin");
            found = true;
          }
        });
        if (!found) setRole("unknown");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (role !== "superadmin") return;

    // Fetch sensor sessions from Firestore
    const fetchSensorSessions = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'sensor_sessions'));
        const sessions = snapshot.docs.map(doc => {
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
        // Sort by timestamp ascending
        allSessions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setSensorSessions(allSessions);
      } catch (error) {
        console.error("Error fetching sensor sessions:", error);
        setSensorSessions(hardcodedSessions);
      }
    };

    fetchSensorSessions();
  }, [role]);

  if (loading) {
    return <div className="loading-container"><p>Loading...</p></div>;
  }

  if (role !== "superadmin") {
    return (
      <div className="loading-container">
        <p>Access denied. Only superadmin can view this page.</p>
      </div>
    );
  }

  // Prepare data for charts
  const chartData = sensorSessions.map(session => ({
    timestamp: session.timestamp,
    ph: session.ph,
    tds: session.tds,
    waterTemp: session.waterTemp,
    airTemp: session.airTemp,
    humidity: session.humidity,
  }));

  // Example KPIs (you can compute averages, min/max, etc.)
  const latest = chartData[chartData.length - 1] || {};
  const kpiCards = [
    {
      title: "Latest pH",
      value: latest.ph ?? "—",
      context: "Most recent pH reading",
    },
    {
      title: "Latest TDS (ppm)",
      value: latest.tds ?? "—",
      context: "Most recent TDS reading",
    },
    {
      title: "Latest Water Temp (°C)",
      value: latest.waterTemp ?? "—",
      context: "Most recent water temperature",
    },
    {
      title: "Latest Air Temp (°C)",
      value: latest.airTemp ?? "—",
      context: "Most recent air temperature",
    },
    {
      title: "Latest Humidity (%)",
      value: latest.humidity ?? "—",
      context: "Most recent humidity reading",
    },
  ];

  return (
    <div className="analytics-page-container">
      <div className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </div>
      <h2>Sensor Analytics</h2>
      <div className="admin-greeting">
        <p>Welcome, {adminName}!</p>
      </div>

      <div className="kpi-cards-container">
        {kpiCards.map((kpi, idx) => (
          <div className="kpi-card" key={idx}>
            <h4 className="kpi-card-title">{kpi.title}</h4>
            <h1 className="kpi-value">{kpi.value}</h1>
            <p className="kpi-context">{kpi.context}</p>
          </div>
        ))}
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h2 className="chart-title">pH Over Time</h2>
          <div className="chart-placeholder">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="ph" stroke="#4CAF50" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-summary">Historical pH readings from sensors.</p>
        </div>
        <div className="chart-card">
          <h2 className="chart-title">TDS (ppm) Over Time</h2>
          <div className="chart-placeholder">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="tds" stroke="#2196F3" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-summary">Historical TDS readings from sensors.</p>
        </div>
        <div className="chart-card">
          <h2 className="chart-title">Water Temperature (°C) Over Time</h2>
          <div className="chart-placeholder">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="waterTemp" stroke="#FF9800" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-summary">Historical water temperature readings from sensors.</p>
        </div>
        <div className="chart-card">
          <h2 className="chart-title">Air Temperature (°C) Over Time</h2>
          <div className="chart-placeholder">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="airTemp" stroke="#F44336" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-summary">Historical air temperature readings from sensors.</p>
        </div>
        <div className="chart-card">
          <h2 className="chart-title">Humidity (%) Over Time</h2>
          <div className="chart-placeholder">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="humidity" stroke="#009688" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-summary">Historical humidity readings from sensors.</p>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;