import { useState, useEffect } from 'react';
import axios from 'axios';

const BookAppointment = ({ onClose, onBookingSuccess }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [purpose, setPurpose] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTimeSlots();
  }, [selectedDate]);

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
      setError('Failed to fetch available time slots');
      console.error('Error fetching time slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot || !purpose.trim()) {
      setError('Please select a time slot and enter a purpose');
      return;
    }

    setBookingLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post('http://localhost:8000/appointments/book', {
        time_slot_id: selectedSlot.id,
        purpose: purpose.trim()
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Step 2: Refresh the time slots to show updated counts
      await fetchTimeSlots(); 
      
      // Step 3: If all is successful, show the success message
      setSuccess(`Your appointment request for ${formatTime(selectedSlot.start_time)} has been sent for approval.`);
      
      setSelectedSlot(null);
      setPurpose('');
      
      if (onBookingSuccess) {
        onBookingSuccess();
      }
    } catch (err) {
      if (err.response?.data?.detail && Array.isArray(err.response.data.detail)) {
        const errorMsg = err.response.data.detail.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join('. ');
        setError(errorMsg);
      } else {
        setError(err.response?.data?.detail || 'Failed to send appointment request');
      }
    } finally {
      setBookingLoading(false);
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
      <div className="modal-content">
        <div className="modal-header">
          <h2>Request an Appointment</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label htmlFor="date">Select Date</label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="form-group">
            <label>Available Time Slots for {formatDate(selectedDate)}</label>
            {loading ? (
              <div className="loading-slots">Loading available slots...</div>
            ) : timeSlots.length === 0 ? (
              <div className="no-slots">No available time slots for this date.</div>
            ) : (
              <div className="time-slots-grid">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.id}
                    className={`time-slot ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    <span className="booked-count">{slot.booked_count > 0 ? `${slot.booked_count} booked` : 'Open'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedSlot && (
            <div className="form-group">
              <label htmlFor="purpose">Purpose of Meeting</label>
              <textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Please describe the purpose of your meeting..."
                rows="3"
                maxLength="500"
              />
              <small>{purpose.length}/500 characters</small>
            </div>
          )}

          <div className="modal-actions">
            <button onClick={onClose} className="button-secondary">
              Cancel
            </button>
            <button
              onClick={handleBookAppointment}
              disabled={!selectedSlot || !purpose.trim() || bookingLoading}
              className="button-primary"
            >
              {bookingLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment; 