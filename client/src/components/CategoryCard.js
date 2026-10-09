import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './common/Card';
import Button from './common/Button';

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

// Category images mapping using realistic photos
const CATEGORY_ICONS = {
    "Potholes": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80",
    "Garbage overflow": "https://images.unsplash.com/photo-1605600659873-d808a1d84f8c?auto=format&fit=crop&w=400&q=80",
    "Streetlight failures": "https://images.unsplash.com/photo-1517594422361-5e18d0dd9965?auto=format&fit=crop&w=400&q=80",
    "Water leakage": "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=400&q=80",
    "Illegal parking": "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=400&q=80",
    "Drainage issues": "https://images.unsplash.com/photo-1584839556847-c0e86b45070f?auto=format&fit=crop&w=400&q=80",
    "Broken footpaths": "https://images.unsplash.com/photo-1517646287270-a5a9ca602518?auto=format&fit=crop&w=400&q=80",
    "Noise pollution": "https://images.unsplash.com/photo-1528731708534-816fe59f90cb?auto=format&fit=crop&w=400&q=80",
    "Sewage problems": "https://images.unsplash.com/photo-1582260655554-7f154dbbc468?auto=format&fit=crop&w=400&q=80",
    "Public safety issues": "https://images.unsplash.com/photo-1585860715330-802c6114aab8?auto=format&fit=crop&w=400&q=80",
    "Other": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80"
};

function CategoryCard({ category }) {
    const navigate = useNavigate();

    const handleQuickRaise = () => {
        // Navigate to submit page with pre-selected category
        navigate('/submit', { state: { category } });
    };

    return (
        <Card 
          onClick={handleQuickRaise}
          className="flex flex-col items-center text-center cursor-pointer hover:shadow-md hover:border-primary-500 transition-normal"
          style={{ padding: '0', overflow: 'hidden' }}
        >
            <div style={{ width: '100%', height: '140px', backgroundColor: '#f1f5f9' }}>
                <img 
                    src={CATEGORY_ICONS[category] || CATEGORY_ICONS["Other"]} 
                    alt={category} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>
            <div style={{ padding: '16px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 className="text-base font-semibold mb-1 text-primary">
                    {category}
                </h3>
                <p className="text-xs text-secondary mb-4">
                    Click to report
                </p>
                <Button 
                    variant="primary" 
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleQuickRaise();
                    }}
                >
                    Report Issue
                </Button>
            </div>
        </Card>
    );
}

export default CategoryCard;
export { CATEGORIES, CATEGORY_ICONS };
