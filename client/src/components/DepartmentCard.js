import React, { useState } from 'react';
import api from '../services/api';

const DEPARTMENTS = [
    "Roads & Potholes",
    "Sanitation",
    "Street Lighting",
    "Water Supply",
    "Drainage",
    "Other"
];

function DepartmentCard({ department, onIssueCreated }) {
    const [isOpen, setIsOpen] = useState(false);
    const [images, setImages] = useState([]);
    const [description, setDescription] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Create preview URLs
        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));

        setImages(prev => [...prev, ...newImages]);
    };

    const removeImage = (index) => {
        setImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].preview);
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const grabLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude.toFixed(6));
                setLongitude(position.coords.longitude.toFixed(6));
            },
            (error) => {
                alert(`Error getting location: ${error.message}`);
            }
        );
    };

    const handleSubmit = async () => {
        if (!description && images.length === 0) {
            alert('Please provide a description or at least one image');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('title', `${department} Issue`);
            formData.append('description', description || 'Quick raise from department card');
            formData.append('location', 'User location');

            if (latitude && longitude) {
                formData.append('coordinates', JSON.stringify({
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude)
                }));
            }

            // Append all image files
            images.forEach(img => {
                formData.append('images', img.file);
            });

            await api.post('/issues', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            alert('Issue submitted successfully!');

            // Reset form
            setDescription('');
            setLatitude('');
            setLongitude('');
            images.forEach(img => URL.revokeObjectURL(img.preview));
            setImages([]);
            setIsOpen(false);

            // Notify parent to refresh
            if (onIssueCreated) {
                onIssueCreated();
            }
        } catch (error) {
            console.error('Error submitting issue:', error);
            alert('Failed to submit issue. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setIsOpen(false);
        setDescription('');
        setLatitude('');
        setLongitude('');
        images.forEach(img => URL.revokeObjectURL(img.preview));
        setImages([]);
    };

    return (
        <div className="department-card">
            <h3>{department}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
                Quick actions: raise complaint, attach images, use current location
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        background: 'linear-gradient(135deg, var(--secondary), #059669)',
                        borderRadius: '8px'
                    }}
                >
                    {isOpen ? 'Close' : 'Quick Raise'}
                </button>
                <a
                    href={`/submit?dept=${encodeURIComponent(department)}`}
                    style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: 'inherit',
                        display: 'inline-block'
                    }}
                >
                    Full Form
                </a>
            </div>

            {isOpen && (
                <div className="quick-raise-form">
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>
                        Attach Images (multiple)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        style={{ marginBottom: '0.75rem' }}
                    />

                    {images.length > 0 && (
                        <div className="image-upload-preview">
                            {images.map((img, index) => (
                                <div key={index} style={{ position: 'relative' }}>
                                    <img src={img.preview} alt={`Preview ${index + 1}`} />
                                    <button
                                        onClick={() => removeImage(index)}
                                        style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            right: '-8px',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: 'var(--danger)',
                                            color: 'white',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            padding: 0
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginTop: '0.75rem', marginBottom: '0.5rem' }}>
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the issue..."
                        rows={3}
                    />

                    <div className="location-inputs">
                        <input
                            type="text"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            placeholder="Latitude"
                        />
                        <input
                            type="text"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            placeholder="Longitude"
                        />
                        <button
                            type="button"
                            onClick={grabLocation}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            📍 Use My Location
                        </button>
                    </div>

                    <div className="form-actions">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{
                                padding: '0.5rem 1.5rem',
                                background: 'linear-gradient(135deg, var(--secondary), #059669)'
                            }}
                        >
                            {loading ? 'Submitting...' : 'Submit'}
                        </button>
                        <button
                            onClick={handleCancel}
                            style={{
                                padding: '0.5rem 1.5rem',
                                background: 'rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DepartmentCard;
export { DEPARTMENTS };
