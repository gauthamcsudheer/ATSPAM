import { useState } from 'react';
import axios from 'axios';

const ProfileManagement = ({ user, onClose, onUpdateSuccess }) => {
    const [name, setName] = useState(user.name);
    const [phone, setPhone] = useState(user.phone || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    
    const token = localStorage.getItem('token');

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await axios.put(
                'http://localhost:8000/me/details',
                { name, phone },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Profile updated successfully!');
            onUpdateSuccess(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await axios.put(
                'http://localhost:8000/me/password',
                { current_password: currentPassword, new_password: newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Password changed successfully!');
            // Clear password fields
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to change password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Manage Profile</h2>
                    <button onClick={onClose} className="close-button">×</button>
                </div>
                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}
                    
                    <form onSubmit={handleProfileUpdate} className="profile-form">
                        <h3>Update Details</h3>
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">Phone</label>
                            <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>

                    <div className="form-divider"></div>

                    <form onSubmit={handlePasswordChange} className="profile-form">
                        <h3>Change Password</h3>
                        <div className="form-group">
                            <label htmlFor="current-password">Current Password</label>
                            <input type="password" id="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="new-password">New Password</label>
                            <input type="password" id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirm-password">Confirm New Password</label>
                            <input type="password" id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileManagement; 