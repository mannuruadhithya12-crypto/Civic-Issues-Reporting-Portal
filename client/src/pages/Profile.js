import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

function Profile() {
    const { user } = useContext(AuthContext);
    const [myTickets, setMyTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedImages, setExpandedImages] = useState({});

    useEffect(() => {
        const fetchMyTickets = async () => {
            try {
                const res = await api.get('/issues/my-tickets');
                setMyTickets(res.data);
            } catch (err) {
                console.error(err);
                alert('Failed to load your tickets');
            } finally {
                setLoading(false);
            }
        };

        fetchMyTickets();
    }, []);

    const toggleImage = (ticketId, imageUrl) => {
        setExpandedImages(prev => {
            if (prev[ticketId] === imageUrl) {
                // Close if clicking the same image
                const newState = { ...prev };
                delete newState[ticketId];
                return newState;
            }
            return { ...prev, [ticketId]: imageUrl };
        });
    };

    const getStatusClass = (status) => {
        return `status-badge ${status}`;
    };

    return (
        <div className="container">
            <h2>My Profile</h2>
            {user && (
                <div style={{ marginBottom: 20 }}>
                    <p><strong>Username:</strong> {user.username}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Role:</strong> {user.role}</p>
                </div>
            )}

            <h3>My Submitted Tickets</h3>
            {loading ? (
                <p>Loading...</p>
            ) : myTickets.length === 0 ? (
                <p>You haven't submitted any tickets yet.</p>
            ) : (
                myTickets.map((ticket) => (
                    <div key={ticket._id} className="issue-card">
                        <h4>{ticket.title}</h4>
                        <div className="issue-meta">
                            {new Date(ticket.createdAt).toLocaleString()}
                        </div>
                        <p style={{ marginTop: 8 }}>{ticket.description}</p>

                        <div className="issue-meta" style={{ marginTop: '0.75rem' }}>
                            <strong>📍 Location:</strong> {ticket.locationName || ticket.location || 'Not provided'}
                        </div>
                        {ticket.coordinates && ticket.coordinates.latitude && (
                            <div className="issue-meta">
                                <strong>Coordinates:</strong> {ticket.coordinates.latitude.toFixed(6)}, {ticket.coordinates.longitude.toFixed(6)}
                            </div>
                        )}

                        <div style={{ marginTop: '0.75rem' }}>
                            <span className={getStatusClass(ticket.status || 'open')}>
                                {ticket.status || 'open'}
                            </span>
                        </div>

                        {ticket.images && ticket.images.length > 0 && (
                            <>
                                <div className="image-gallery">
                                    {ticket.images.map((image, index) => (
                                        <img
                                            key={index}
                                            src={`http://localhost:5000${image}`}
                                            alt={`Ticket ${index + 1}`}
                                            onClick={() => toggleImage(ticket._id, `http://localhost:5000${image}`)}
                                            title="Click to expand"
                                            style={{
                                                width: '100px',
                                                height: '100px',
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                border: expandedImages[ticket._id] === `http://localhost:5000${image}` ? '3px solid var(--primary)' : '2px solid transparent'
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Expanded Image Inline */}
                                {expandedImages[ticket._id] && (
                                    <div style={{ marginTop: '1rem', position: 'relative', animation: 'fadeIn 0.3s ease' }}>
                                        <img
                                            src={expandedImages[ticket._id]}
                                            alt="Expanded view"
                                            style={{
                                                width: '100%',
                                                maxHeight: '500px',
                                                objectFit: 'contain',
                                                borderRadius: '8px',
                                                boxShadow: 'var(--shadow-lg)',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => toggleImage(ticket._id, expandedImages[ticket._id])}
                                        />
                                        <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                            Click image to close
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

export default Profile;
