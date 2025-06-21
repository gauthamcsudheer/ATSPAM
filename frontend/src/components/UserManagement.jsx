import { useState, useEffect } from 'react';
import axios from 'axios';

const UserManagement = ({ onClose }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const token = localStorage.getItem('token');
    const validRoles = ["faculty", "student", "principal", "admin"];

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get('http://localhost:8000/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (err) {
            setError('Failed to fetch users.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId, newRole) => {
        try {
            await axios.put(
                `http://localhost:8000/admin/users/${userId}/role`,
                { role: newRole },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Refresh users list
            fetchUsers();
        } catch (err) {
            setError('Failed to update user role.');
            console.error(err);
        }
    };

    const handleStatusChange = async (userId, newStatus) => {
        try {
            await axios.put(
                `http://localhost:8000/admin/users/${userId}/status`,
                { is_active: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Refresh users list
            fetchUsers();
        } catch (err) {
            setError('Failed to update user status.');
            console.error(err);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content large">
                <div className="modal-header">
                    <h2>User Management</h2>
                    <button onClick={onClose} className="close-button">×</button>
                </div>
                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}
                    {loading ? (
                        <div>Loading users...</div>
                    ) : (
                        <table className="user-management-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <select 
                                                value={user.role} 
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className="role-select"
                                            >
                                                {validRoles.map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${user.is_active ? 'active' : 'inactive'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <label className="switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={user.is_active} 
                                                    onChange={(e) => handleStatusChange(user.id, e.target.checked)} 
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement; 