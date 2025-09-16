import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FaCloudRain, FaCloudSun, FaTemperatureHigh, FaTint, FaWater } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import {
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
import '../../styles/AnalyticsPage.css';

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null); 
  const [adminName, setAdminName] = useState("");
  const [uid, setUid] = useState(null); 
  const [isAdminUid, setIsAdminUid] = useState(false);
  const navigate = useNavigate();

  // Sensor data state
  const [sensorSessions, setSensorSessions] = useState([]);
  // Plant type pie chart state
  const [plantTypeData, setPlantTypeData] = useState([]);

  // ✅ Hardcoded sensor data fallback
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

  // ✅ Hardcoded plant types fallback
  const hardcodedPlantTypes = [
    { name: "Lettuce", value: 4 },
    { name: "Tomato", value: 1 }
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
            const cleanName = (data.name || "Admin").replace(/\s*\(superadmin\)|\s*\(admin\)/gi, "");
            setAdminName(cleanName);
            found = true;
            if (data.role === "admin") setIsAdminUid(true);
          }
        });
        if (!found) setRole("unknown");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (role !== "superadmin" && !isAdminUid) return;

    // Fetch sensor sessions
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
        const allSessions = [...sessions, ...hardcodedSessions];
        allSessions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setSensorSessions(allSessions);
      } catch (error) {
        setSensorSessions(hardcodedSessions);
      }
    };

    // Fetch plant types
    const fetchPlantTypes = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'user_logs_PlantLogs'));
        const typeCounts = {};
        snapshot.forEach(doc => {
          const plantType = doc.data().plantType || 'Unknown';
          typeCounts[plantType] = (typeCounts[plantType] || 0) + 1;
        });

        let pieData = Object.entries(typeCounts).map(([type, count]) => ({
          name: type,
          value: count,
        }));

        // ✅ fallback if empty
        if (pieData.length === 0) {
          pieData = hardcodedPlantTypes;
        }

        setPlantTypeData(pieData);
      } catch (err) {
        setPlantTypeData(hardcodedPlantTypes);
      }
    };

    fetchSensorSessions();
    fetchPlantTypes();
  }, [role, isAdminUid]);

  if (loading) {
    return <div className="loading-container"><p>Loading...</p></div>;
  }

  if (role !== "superadmin" && !isAdminUid) {
    return (
      <div className="loading-container">
        <Navbar role={role} />
        <p>Access denied. Only Super Admin and Admin can view this page.</p>
      </div>
    );
  }

  const chartData = sensorSessions.map(session => ({
    timestamp: session.timestamp,
    ph: session.ph,
    tds: session.tds,
    waterTemp: session.waterTemp,
    airTemp: session.airTemp,
    humidity: session.humidity,
  }));

  const latest = chartData[chartData.length - 1] || {};
  const kpiCards = [
    {
      title: "Latest pH",
      value: latest.ph ?? "—",
      context: "Most recent pH reading",
      icon: <FaTint color="#4CAF50" size={24} />,
    },
    {
      title: "Latest TDS (ppm)",
      value: latest.tds ?? "—",
      context: "Most recent TDS reading",
      icon: <FaWater color="#2196F3" size={24} />,
    },
    {
      title: "Latest Water Temp (°C)",
      value: latest.waterTemp ?? "—",
      context: "Most recent water temperature",
      icon: <FaTemperatureHigh color="#FF9800" size={24} />,
    },
    {
      title: "Latest Air Temp (°C)",
      value: latest.airTemp ?? "—",
      context: "Most recent air temperature",
      icon: <FaCloudSun color="#F44336" size={24} />,
    },
    {
      title: "Latest Humidity (%)",
      value: latest.humidity ?? "—",
      context: "Most recent humidity reading",
      icon: <FaCloudRain color="#009688" size={24} />,
    },
  ];

  const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#009688', '#9C27B0'];

  return (
    <div className="analytics-page-container">
      <Navbar role={role} />

      <h2 className="analytics-main-title" style={{ '--title-offset-x': '120px' }}>Sensor Analytics</h2>

      <div className="kpi-cards-container">
        {kpiCards.map((kpi, idx) => (
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

      <div className="charts-container">
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

        {/* Line charts */}
        <div className="chart-card">
          <h2 className="chart-title">pH Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="ph" stroke="#4CAF50" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-summary">Historical pH readings from sensors.</p>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">TDS (ppm) Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="tds" stroke="#2196F3" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-summary">Historical TDS readings from sensors.</p>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Water Temperature (°C) Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="waterTemp" stroke="#FF9800" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-summary">Historical water temperature readings from sensors.</p>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Air Temperature (°C) Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="airTemp" stroke="#F44336" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-summary">Historical air temperature readings from sensors.</p>
        </div>

        <div className="chart-card">
          <h2 className="chart-title">Humidity (%) Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="humidity" stroke="#009688" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-summary">Historical humidity readings from sensors.</p>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
