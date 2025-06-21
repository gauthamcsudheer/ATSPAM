import { useState, useEffect } from 'react';
import axios from 'axios';

const QueueManagement = ({ onClose }) => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchQueue();
    // Refresh queue every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:8000/queue/today', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Sort queue by time slot start time (chronological order)
      const sortedQueue = response.data.sort((a, b) => {
        if (a.time_slot_details && b.time_slot_details) {
          return new Date(a.time_slot_details.start_time) - new Date(b.time_slot_details.start_time);
        }
        return 0;
      });
      setQueue(sortedQueue);
    } catch (err) {
      setError('Failed to fetch queue');
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    setUpdatingStatus(appointmentId);
    try {
      await axios.put(`http://localhost:8000/appointments/${appointmentId}/status?status=${newStatus}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Refresh queue after status update
      fetchQueue();
    } catch (err) {
      setError('Failed to update appointment status');
      console.error('Error updating status:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'booked':
        return 'status-booked';
      case 'active':
        return 'status-active';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'booked':
        return 'Waiting';
      case 'active':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusActions = (appointment) => {
    switch (appointment.status) {
      case 'booked':
        return (
          <>
            <button
              onClick={() => updateAppointmentStatus(appointment.id, 'active')}
              disabled={updatingStatus === appointment.id}
              className="action-button start"
            >
              {updatingStatus === appointment.id ? 'Starting...' : 'Start Meeting'}
            </button>
            <button
              onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
              disabled={updatingStatus === appointment.id}
              className="action-button cancel"
            >
              Cancel
            </button>
          </>
        );
      case 'active':
        return (
          <button
            onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
            disabled={updatingStatus === appointment.id}
            className="action-button complete"
          >
            {updatingStatus === appointment.id ? 'Completing...' : 'Complete Meeting'}
          </button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="loading">Loading today's queue...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>Today's Queue</h2>
          <div className="header-actions">
            <button onClick={fetchQueue} className="refresh-button">
              🔄 Refresh
            </button>
            <button onClick={onClose} className="close-button">×</button>
          </div>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          {queue.length === 0 ? (
            <div className="no-appointments">
              <div className="no-appointments-icon">📋</div>
              <h3>No Appointments Today</h3>
              <p>There are no appointments scheduled for today.</p>
            </div>
          ) : (
            <div className="appointments-list" data-testid="queue-list">
              {queue.map((appt) => (
                <div key={appt.id} className="appointment-card">
                  <div className="appointment-header">
                    <span className="token-number">Token #{appt.token_number}</span>
                    <span className={`status-badge status-${appt.status.toLowerCase()}`}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="appointment-details">
                    <div className="detail-row">
                      <strong>Time:</strong>
                      <span>
                        {appt.time_slot_details
                          ? formatTime(appt.time_slot_details.start_time)
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <strong>Requester:</strong>
                      <span>
                        {appt.user_details?.name || 'N/A'} (
                        {appt.user_details?.email || 'N/A'})
                      </span>
                    </div>
                    <div className="detail-row">
                      <strong>Purpose:</strong>
                      <span>{appt.purpose}</span>
                    </div>
                  </div>
                  <div className="queue-actions">
                    {getStatusActions(appt)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="modal-actions">
            <button onClick={onClose} className="button-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueManagement; 