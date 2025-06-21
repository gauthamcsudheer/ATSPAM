import { useState, useEffect } from 'react';
import axios from 'axios';
import BookAppointment from './BookAppointment';
import MyAppointments from './MyAppointments';
import QueueManagement from './QueueManagement';
import ScheduleManagement from './ScheduleManagement';
import PendingAppointments from './PendingAppointments';
import UserManagement from './UserManagement';
import ProfileManagement from './ProfileManagement';
import SystemOverview from './SystemOverview';
import Notifications from './Notifications';

const Dashboard = ({ user, onLogout }) => {
  const [userInfo, setUserInfo] = useState(user);
  const [loading, setLoading] = useState(false);
  const [showBookAppointment, setShowBookAppointment] = useState(false);
  const [showMyAppointments, setShowMyAppointments] = useState(false);
  const [showQueueManagement, setShowQueueManagement] = useState(false);
  const [showScheduleManagement, setShowScheduleManagement] = useState(false);
  const [showPendingAppointments, setShowPendingAppointments] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showProfileManagement, setShowProfileManagement] = useState(false);
  const [showSystemOverview, setShowSystemOverview] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const token = localStorage.getItem('token');

  const isPrincipalOrAdmin = user.role === 'principal' || user.role === 'admin';

  useEffect(() => {
    // Fetch current user info from API
    const fetchUserInfo = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8000/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setUserInfo(response.data);
      } catch (err) {
        console.error('Failed to fetch user info:', err);
        // If token is invalid, logout
        if (err.response?.status === 401) {
          handleLogout();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get('http://localhost:8000/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(response.data);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 15000); // Poll every 15 seconds
    return () => clearInterval(intervalId);
  }, [token]);

  useEffect(() => {
    if (isPrincipalOrAdmin) {
      const fetchPendingCount = async () => {
        try {
          const response = await axios.get('http://localhost:8000/appointments/pending', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setPendingCount(response.data.length);
        } catch (error) {
          console.error('Failed to fetch pending appointments count', error);
        }
      };
      
      fetchPendingCount();
      // Poll for new requests every 30 seconds
      const intervalId = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(intervalId);
    }
  }, [isPrincipalOrAdmin, token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  const handleClearNotifications = async () => {
    try {
      await axios.put('http://localhost:8000/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Optimistically update UI
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'faculty': 'Faculty Member',
      'student': 'Student',
      'principal': 'Principal',
      'admin': 'Administrator'
    };
    return roleMap[role] || role;
  };

  const handleBookingSuccess = () => {
    setShowBookAppointment(false);
    // Maybe refresh my appointments
    setShowMyAppointments(true);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Welcome to ATSPAM</h1>
          <p>Automated Token System for Principal's Appointment Management</p>
        </div>
        <div className="header-actions">
          <div className="notifications-container">
            <button onClick={() => setShowNotifications(!showNotifications)} className="notification-button">
              <span role="img" aria-label="Notifications">🔔</span>
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="notification-badge-bell">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>
            {showNotifications && (
              <Notifications 
                notifications={notifications} 
                onClearAll={handleClearNotifications} 
              />
            )}
          </div>
          <button onClick={handleLogout} className="logout-button">
            Sign Out
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="user-info-card">
          <div className="card-header">
            <h2>Your Profile</h2>
            <button onClick={() => setShowProfileManagement(true)} className="manage-profile-button">
              Edit Profile
            </button>
          </div>
          <div className="user-details">
            <div className="detail-item">
              <strong>Name:</strong>
              <span>{userInfo?.name}</span>
            </div>
            <div className="detail-item">
              <strong>Email:</strong>
              <span>{userInfo?.email}</span>
            </div>
            <div className="detail-item">
              <strong>Role:</strong>
              <span>{getRoleDisplayName(userInfo?.role)}</span>
            </div>
            {userInfo?.phone && (
              <div className="detail-item">
                <strong>Phone:</strong>
                <span>{userInfo.phone}</span>
              </div>
            )}
            <div className="detail-item">
              <strong>Status:</strong>
              <span className={`status ${userInfo?.is_active ? 'active' : 'inactive'}`}>
                {userInfo?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            {userInfo?.role === 'faculty' || userInfo?.role === 'student' ? (
              <>
                <button 
                  className="action-button primary"
                  onClick={() => setShowBookAppointment(true)}
                >
                  📅 Book Appointment
                </button>
                <button 
                  className="action-button secondary"
                  onClick={() => setShowMyAppointments(true)}
                >
                  📋 View My Appointments
                </button>
                <button className="action-button secondary">
                  ⏰ Check Queue Status
                </button>
              </>
            ) : userInfo?.role === 'principal' ? (
              <>
                <button 
                  className="action-button primary"
                  onClick={() => setShowQueueManagement(true)}
                >
                  👥 View Current Queue
                </button>
                <button 
                  className="action-button secondary"
                  onClick={() => setShowScheduleManagement(true)}
                >
                  📅 Manage Schedule
                </button>
                <button className="action-button primary" onClick={() => setShowPendingAppointments(true)}>
                  Pending Requests
                  {pendingCount > 0 && <span className="notification-badge">{pendingCount}</span>}
                </button>
              </>
            ) : (
              <>
                <button 
                  className="action-button primary"
                  onClick={() => setShowSystemOverview(true)}
                >
                  📊 System Overview
                </button>
                <button 
                  className="action-button secondary"
                  onClick={() => setShowUserManagement(true)}
                >
                  👥 User Management
                </button>
                <button className="action-button secondary">
                  ⚙️ System Settings
                </button>
              </>
            )}
          </div>
        </div>

        <div className="coming-soon">
          <h3>Coming Soon</h3>
          <p>We're working hard to bring you more features:</p>
          <ul>
            <li>Real-time queue updates and notifications</li>
            <li>Advanced appointment scheduling with calendar integration</li>
            <li>Comprehensive analytics and reporting dashboard</li>
            <li>Mobile app for on-the-go access</li>
            <li>Email and SMS notification system</li>
            <li>Integration with existing college systems</li>
          </ul>
        </div>
      </div>

      {/* Modals */}
      {showBookAppointment && (
        <BookAppointment 
          onClose={() => setShowBookAppointment(false)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {showMyAppointments && (
        <MyAppointments 
          onClose={() => setShowMyAppointments(false)}
        />
      )}

      {showQueueManagement && (
        <QueueManagement 
          onClose={() => setShowQueueManagement(false)}
        />
      )}

      {showScheduleManagement && (
        <ScheduleManagement 
          onClose={() => setShowScheduleManagement(false)}
        />
      )}

      {showPendingAppointments && <PendingAppointments onClose={() => setShowPendingAppointments(false)} />}

      {showUserManagement && <UserManagement onClose={() => setShowUserManagement(false)} />}

      {showProfileManagement && 
        <ProfileManagement 
          user={userInfo} 
          onClose={() => setShowProfileManagement(false)}
          onUpdateSuccess={(updatedUser) => {
            setUserInfo(updatedUser);
            setShowProfileManagement(false);
          }}
        />
      }

      {showSystemOverview && <SystemOverview onClose={() => setShowSystemOverview(false)} />}
    </div>
  );
};

export default Dashboard; 