import { useState, useEffect } from 'react';
import axios from 'axios';

const PendingAppointments = ({ onClose }) => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:8000/appointments/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPending(response.data.sort((a, b) => new Date(a.booked_at) - new Date(b.booked_at)));
    } catch (err) {
      setError('Failed to fetch pending appointments.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleReview = async (id, action) => {
    try {
      await axios.put(
        `http://localhost:8000/appointments/${id}/review`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh the list after action
      fetchPending();
    } catch (err) {
      setError(`Failed to ${action} appointment.`);
      console.error(err);
    }
  };

  const formatTime = (dateTimeString) => new Date(dateTimeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (dateTimeString) => new Date(dateTimeString).toLocaleDateString();

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>Pending Appointment Requests</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          {loading && <div>Loading requests...</div>}
          {!loading && pending.length === 0 ? (
            <div className="no-appointments">No pending requests at the moment.</div>
          ) : (
            <div className="appointments-list">
              {pending.map((appt) => (
                <div key={appt.id} className="appointment-card">
                  <div className="appointment-details">
                    <div className="detail-row">
                      <strong>Requester:</strong>
                      <span>{appt.user_details?.name} ({appt.user_details?.email})</span>
                    </div>
                    <div className="detail-row">
                      <strong>Requested Slot:</strong>
                      <span>{formatDate(appt.time_slot_details?.start_time)} at {formatTime(appt.time_slot_details?.start_time)}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Purpose:</strong>
                      <span>{appt.purpose}</span>
                    </div>
                  </div>
                  <div className="queue-actions">
                    <button onClick={() => handleReview(appt.id, 'approve')} className="action-button start">Approve</button>
                    <button onClick={() => handleReview(appt.id, 'reject')} className="action-button cancel">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingAppointments; 