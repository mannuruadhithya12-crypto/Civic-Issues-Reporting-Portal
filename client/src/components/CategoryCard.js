import React from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
    "Potholes",
    "Garbage overflow",
    "Streetlight failures",
    "Water leakage",
    "Illegal parking",
    "Drainage issues",
    "Broken footpaths",
    "Noise pollution",
    "Sewage problems",
    "Public safety issues",
    "Other"
];

// Category icons mapping
const CATEGORY_ICONS = {
    "Potholes": "🕳️",
    "Garbage overflow": "🗑️",
    "Streetlight failures": "💡",
    "Water leakage": "💧",
    "Illegal parking": "🚗",
    "Drainage issues": "🌊",
    "Broken footpaths": "🚶",
    "Noise pollution": "🔊",
    "Sewage problems": "🚽",
    "Public safety issues": "⚠️",
    "Other": "📋"
};

function CategoryCard({ category }) {
    const navigate = useNavigate();

    const handleQuickRaise = () => {
        // Navigate to submit page with pre-selected category
        navigate('/submit', { state: { category } });
    };

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            textAlign: 'center'
        }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                e.currentTarget.style.borderColor = 'var(--theme-accent)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onClick={handleQuickRaise}
        >
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
                {CATEGORY_ICONS[category] || "📋"}
            </div>
            <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: 'var(--theme-text-dark)'
            }}>
                {category}
            </h3>
            <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-light)',
                marginBottom: '1rem'
            }}>
                Click to report
            </p>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleQuickRaise();
                }}
                style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                }}
                onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                }}
            >
                Report Issue
            </button>
        </div>
    );
}

export default CategoryCard;
export { CATEGORIES, CATEGORY_ICONS };
