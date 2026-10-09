import React, { useState } from 'react';

const WorkerHelp = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFaq, setActiveFaq] = useState(null);

    const faqs = [
        {
            id: 1,
            question: 'How do I log materials used for a task?',
            answer: 'When you arrive at the task location, click "Start Work". Once you are finished, click "Complete Task". In the Execution Wizard, you will see a field for "Materials Used". Enter all materials there before submitting your final report.'
        },
        {
            id: 2,
            question: 'What if I cannot find the location?',
            answer: 'Use the "Navigate" button on the Task Details page to open Google Maps or Apple Maps with the exact GPS coordinates. If you still cannot locate the issue, please contact dispatch or add a comment to the task.'
        },
        {
            id: 3,
            question: 'The issue requires different equipment than what I have.',
            answer: 'If you arrive and realize you need different equipment, go to the Task Details page and add a comment explaining the situation. Then, contact dispatch to reassign or delay the task.'
        },
        {
            id: 4,
            question: 'How do I change my password?',
            answer: 'Go to "My Profile" from the sidebar navigation. Scroll down to the "Personal Information" section where you will find the option to change your password.'
        }
    ];

    const filteredFaqs = faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-page-wrapper" style={{ backgroundColor: '#f9fafb', padding: '1.5rem', minHeight: '100vh' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem', padding: '2rem 0' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--w-neutral-900)' }}>How can we help you?</h1>
                    <p style={{ color: 'var(--w-neutral-500)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>Search our knowledge base or browse frequently asked questions below to find the answers you need.</p>
                    
                    <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--w-neutral-400)', fontSize: '1.25rem' }}>🔍</span>
                        <input 
                            type="text" 
                            style={{ 
                                width: '100%', padding: '1rem 1rem 1rem 3rem', 
                                border: '1px solid var(--w-neutral-300)', borderRadius: '9999px', 
                                fontSize: '1.125rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' 
                            }}
                            placeholder="Search for articles, guides, or FAQs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div className="w-card" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-5px)' } }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--w-neutral-900)' }}>Worker Manual</h3>
                        <p style={{ color: 'var(--w-neutral-500)', fontSize: '0.875rem', margin: 0 }}>Comprehensive guide to using the CivicConnect Worker Portal.</p>
                    </div>
                    <div className="w-card" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📞</div>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--w-neutral-900)' }}>Contact Dispatch</h3>
                        <p style={{ color: 'var(--w-neutral-500)', fontSize: '0.875rem', margin: 0 }}>Reach out to dispatch directly for immediate assistance.</p>
                        <div style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--w-primary)' }}>1-800-CIVIC-OPS</div>
                    </div>
                    <div className="w-card" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚨</div>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--w-neutral-900)' }}>Report an Incident</h3>
                        <p style={{ color: 'var(--w-neutral-500)', fontSize: '0.875rem', margin: 0 }}>File a report for workplace hazards or on-site accidents.</p>
                    </div>
                </div>

                <div className="w-card" style={{ padding: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem 0', color: 'var(--w-neutral-900)' }}>Frequently Asked Questions</h2>
                    
                    {filteredFaqs.length === 0 ? (
                        <p style={{ color: 'var(--w-neutral-500)' }}>No FAQs match your search.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredFaqs.map(faq => (
                                <div 
                                    key={faq.id} 
                                    style={{ 
                                        border: '1px solid var(--w-neutral-200)', 
                                        borderRadius: '8px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <button 
                                        style={{ 
                                            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '1.25rem 1.5rem', background: activeFaq === faq.id ? 'var(--w-neutral-50)' : 'white',
                                            border: 'none', cursor: 'pointer', textAlign: 'left',
                                            fontWeight: 600, fontSize: '1rem', color: 'var(--w-neutral-900)'
                                        }}
                                        onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                                    >
                                        <span>{faq.question}</span>
                                        <span style={{ transform: activeFaq === faq.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                                            ▼
                                        </span>
                                    </button>
                                    
                                    {activeFaq === faq.id && (
                                        <div style={{ padding: '0 1.5rem 1.25rem 1.5rem', color: 'var(--w-neutral-600)', lineHeight: 1.6, backgroundColor: 'var(--w-neutral-50)' }}>
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkerHelp;
