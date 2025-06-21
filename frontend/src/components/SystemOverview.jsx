import { useState, useEffect } from 'react';
import axios from 'axios';

const SystemOverview = ({ onClose }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await axios.get('http://localhost:8000/admin/overview-stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
            } catch (err) {
                setError('Failed to fetch system statistics.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [token]);

    const StatCard = ({ title, value, details }) => (
        <div className="stat-card">
            <h3 className="stat-title">{title}</h3>
            <p className="stat-value">{value}</p>
            {details && <p className="stat-details">{details}</p>}
        </div>
    );

    const renderUserRoleStats = () => {
        if (!stats.users_by_role) return null;
        return Object.entries(stats.users_by_role)
            .map(([role, count]) => `${role.charAt(0).toUpperCase() + role.slice(1)}: ${count}`)
            .join(' | ');
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content large">
                <div className="modal-header">
                    <h2>System Overview</h2>
                    <button onClick={onClose} className="close-button">×</button>
                </div>
                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}
                    {loading ? (
                        <div>Loading statistics...</div>
                    ) : stats ? (
                        <div className="stats-grid">
                            <StatCard 
                                title="Pending Requests" 
                                value={stats.pending_appointments}
                                details="Appointments awaiting approval."
                            />
                            <StatCard 
                                title="Appointments Today" 
                                value={stats.appointments_today}
                                details="Confirmed appointments for today."
                            />
                            <StatCard 
                                title="Total Users" 
                                value={stats.total_users}
                                details={renderUserRoleStats()}
                            />
                        </div>
                    ) : (
                        <div className="no-appointments">No statistics to display.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemOverview; 