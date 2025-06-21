import { useState, useEffect } from 'react';
import axios from 'axios';

const ScheduleManagement = ({ onClose }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTimeSlots();
  }, [selectedDate]);

  // Utility function to convert local time to UTC
  const localToUTC = (dateStr, timeStr) => {
    const localDate = new Date(`${dateStr}T${timeStr}:00`);
    const utcDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
    return utcDate.toISOString();
  };

  const fetchTimeSlots = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`http://localhost:8000/schedule/time-slots?day=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Sort time slots by start time (backend already sorts, but ensure frontend consistency)
      const sortedSlots = response.data.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      setTimeSlots(sortedSlots);
    } catch (err) {
      setError('Failed to fetch time slots');
      console.error('Error fetching time slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTimeSlot = async () => {
    if (!startTime || !endTime) {
      setError('Please select both start and end times');
      return;
    }

    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    setCreating(true);
    setError('');
    try {
      // Convert local time to UTC for backend storage
      const startUTC = localToUTC(selectedDate, startTime);
      const endUTC = localToUTC(selectedDate, endTime);

      await axios.post('http://localhost:8000/schedule/time-slots', {
        start_time: startUTC,
        end_time: endUTC,
        is_available: true
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setSuccess('Time slot created successfully!');
      setStartTime('09:00');
      setEndTime('10:00');
      fetchTimeSlots();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create time slot');
    } finally {
      setCreating(false);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>Schedule Management</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="schedule-section">
            <h3>Create New Time Slot</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="startTime">Start Time</label>
                <input
                  type="time"
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="endTime">End Time</label>
                <input
                  type="time"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            
            <button
              onClick={handleCreateTimeSlot}
              disabled={creating}
              className="button-primary"
            >
              {creating ? 'Creating...' : 'Create Time Slot'}
            </button>
          </div>

          <div className="schedule-section">
            <h3>Time Slots for {formatDate(selectedDate)}</h3>
            {loading ? (
              <div className="loading-slots">Loading time slots...</div>
            ) : timeSlots.length === 0 ? (
              <div className="no-slots">No time slots created for this date.</div>
            ) : (
              <div className="time-slots-list">
                {timeSlots.map((slot) => (
                  <div key={slot.id} className="time-slot-item">
                    <div className="slot-time">
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </div>
                    <div className={`slot-status ${slot.is_available ? 'available' : 'booked'}`}>
                      {slot.is_available ? 'Available' : 'Booked'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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

export default ScheduleManagement; 