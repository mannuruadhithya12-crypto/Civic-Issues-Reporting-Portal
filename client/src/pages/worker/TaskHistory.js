import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const TaskHistory = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await api.get('/worker/assigned');
                const historyTasks = res.data.filter(t => t.status === 'resolved' || t.status === 'closed');
                
                // Sort by updated date, descending
                historyTasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                setTasks(historyTasks);
            } catch (err) {
                console.error("Failed to fetch task history", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    return (
        <div className="w-page-wrapper" style={{ backgroundColor: '#f9fafb', padding: '1.5rem', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--w-neutral-900)' }}>Task History</h1>
                        <p style={{ color: 'var(--w-neutral-500)', margin: 0 }}>Review all your completed and closed tasks.</p>
                    </div>
                </div>

                <div className="w-card" style={{ padding: 0 }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--w-neutral-500)' }}>Loading history...</div>
                    ) : tasks.length === 0 ? (
                        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📊</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--w-neutral-900)', margin: '0 0 0.5rem 0' }}>No tasks found</h3>
                            <p style={{ color: 'var(--w-neutral-500)', margin: 0 }}>You haven't completed any tasks yet.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--w-neutral-50)', borderBottom: '1px solid var(--w-neutral-200)' }}>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--w-neutral-500)', fontWeight: 600 }}>Task ID</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--w-neutral-500)', fontWeight: 600 }}>Category</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--w-neutral-500)', fontWeight: 600 }}>Completed On</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--w-neutral-500)', fontWeight: 600 }}>Location</th>
                                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--w-neutral-500)', fontWeight: 600 }}>Status</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map(task => (
                                    <tr key={task._id} style={{ borderBottom: '1px solid var(--w-neutral-100)', cursor: 'pointer', transition: 'background-color 0.2s' }} onClick={() => navigate(`/worker/tasks/${task._id}`)}>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--w-neutral-900)' }}>#{task._id.substring(task._id.length - 6).toUpperCase()}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--w-neutral-600)' }}>{task.category}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--w-neutral-600)' }}>{new Date(task.updatedAt).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--w-neutral-600)' }}>{task.location}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span className={`w-badge w-badge-${task.status}`}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <button className="w-btn w-btn-ghost" style={{ padding: '0.5rem' }}>
                                                View →
                                            </button>
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

export default TaskHistory;
