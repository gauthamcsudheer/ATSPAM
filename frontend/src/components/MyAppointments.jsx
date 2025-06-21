import { useState, useEffect } from 'react';
import axios from 'axios';

const MyAppointments = ({ onClose }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:8000/appointments/my-appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const sortedAppointments = response.data.sort((a, b) => new Date(b.booked_at) - new Date(a.booked_at));
      setAppointments(sortedAppointments);
    } catch (err) {
      setError('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }
    
    try {
      await axios.put(
        `http://localhost:8000/appointments/${appointmentId}/status?status=cancelled`,
        {}, // Empty body for PUT request
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh the list after cancellation
      fetchAppointments();
    } catch (err) {
      setError('Failed to cancel appointment. Please try again.');
      console.error(err);
    }
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
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
    const statusMap = {
      pending: 'Pending Approval',
      booked: 'Approved',
      rejected: 'Rejected',
      active: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const isCancellable = (status) => {
    return ['pending', 'booked'].includes(status);
  }

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="loading">Loading your appointments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>My Appointments</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          {appointments.length === 0 ? (
            <div className="no-appointments">
              <div className="no-appointments-icon">📅</div>
              <h3>No Appointments Yet</h3>
              <p>You haven't booked any appointments yet. Click "Book Appointment" to schedule a meeting with the principal.</p>
            </div>
          ) : (
            <div className="appointments-list">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="appointment-card">
                  <div className="appointment-header">
                    <span className={`status-badge status-${appointment.status.toLowerCase()}`}>
                      {getStatusText(appointment.status)}
                    </span>
                    {appointment.status === 'booked' && appointment.token_number && (
                      <span className="token-number">Token #{appointment.token_number}</span>
                    )}
                  </div>
                  
                  <div className="appointment-details">
                    <div className="detail-row">
                      <strong>Date & Time:</strong>
                      <span>
                        {appointment.time_slot_details && (
                          <>
                            {formatDateTime(appointment.time_slot_details.start_time)} - {formatTime(appointment.time_slot_details.end_time)}
                          </>
                        )}
                      </span>
                    </div>
                    
                    <div className="detail-row">
                      <strong>Purpose:</strong>
                      <span>{appointment.purpose}</span>
                    </div>
                    
                    <div className="detail-row">
                      <strong>Booked On:</strong>
                      <span>{formatDateTime(appointment.booked_at)}</span>
                    </div>
                  </div>

                  {isCancellable(appointment.status) && (
                    <div className="appointment-actions">
                      <button 
                        onClick={() => handleCancel(appointment.id)} 
                        className="action-button cancel-small"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  )}
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

export default MyAppointments; 