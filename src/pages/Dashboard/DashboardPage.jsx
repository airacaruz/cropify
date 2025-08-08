import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import '../../styles/DashboardPage.css';
import LogoutButton from '../../components/LogoutButton';

// Mocking lucide-react icons for a self-contained example
const Users = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const Package = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="m21 8.62-9-5.15-9 5.15 9 5.15 9-5.15Z"/><path d="M3.5 12.27v6.88l8.5 4.88 8.5-4.88v-6.88"/><path d="M12 22.27V12.27"/></svg>;

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

// Define the UserRow component here
const UserRow = ({ name, email, role, avatar }) => {
    return (
        <div className="user-row">
            <img src={avatar} alt={name} className="user-row-avatar" />
            <div className="user-row-details">
                <p className="user-row-name">{name}</p>
                <p className="user-row-email">{email}</p>
            </div>
            <span className="user-row-role">{role}</span>
        </div>
    );
};


const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [adminName, setAdminName] = useState("");

    // State variables for user data from Firestore
    const [totalUsers, setTotalUsers] = useState("..."); // Initialize with loading indicator
    const [totalActiveUsers, setTotalActiveUsers] = useState("..."); // Initialize with loading indicator (renamed for clarity)

    // We'll keep these static as per your previous request,
    // but you could fetch them from Firestore/other APIs too.
    const [totalSales, setTotalSales] = useState("$89,000");
    const [activeSensors, setActiveSensors] = useState("12");

    useEffect(() => {
        const storedName = localStorage.getItem("adminName");
        setAdminName(storedName || "Admin");

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigate('/', { replace: true });
            } else {
                setLoading(false);
                fetchDashboardData(); // Fetch all dashboard data after authentication
            }
        });

        return () => unsubscribe();
    }, [navigate]); // No need for `functions` in dependencies anymore

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
            const snapshot = await getDocs(sessionLogs); // Use getDocs to read all documents

            const uniqueUsers = new Set();
            snapshot.forEach((doc) => {
                const log = doc.data();
                const userId = log.userId;

                if (userId) { // Ensure userId exists
                    uniqueUsers.add(userId);
                }
            });
            setTotalActiveUsers(uniqueUsers.size.toLocaleString()); // Set the count of unique users
        } catch (error) {
            console.error('Error fetching total active users:', error);
            setTotalActiveUsers("Error");
        }
    };

    // Consolidated function to fetch all dashboard data
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
                <h2 className="dashboard-main-title" >Dashboard</h2>
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
                        value={totalActiveUsers} // Now displays the count from unique sessions
                        icon={<Package />}
                        bgColorClass="bg-green-secondary"
                        textColorClass="text-gray-800"
                    />
                </div>

                {/* Specific Navigation Cards */}
                <div className="dashboard-navigation-cards-grid">
                    <Link to='/userrecords' className="dashboard-nav-link">
                        <div className="dashboard-nav-card">
                            <i className="icon user-icon"></i>
                            <span>Users Records</span>
                        </div>
                    </Link>
                    <Link to='/adminrecords' className="dashboard-nav-link">
                        <div className="dashboard-nav-card">
                            <i className="icon user-icon"></i>
                            <span>Admin Records</span>
                        </div>
                    </Link>
                    
                </div>

                {/* Recent Activities and Top Users Sections */}
                <div className="dashboard-data-sections-grid">
                    {/* Recent Activities Card */}
                    
                </div>
            </main>
        </div>
    );
};

export default Dashboard;