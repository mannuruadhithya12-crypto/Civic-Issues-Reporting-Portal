import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const TaskExecutionWizard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    
    // Form Data
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [actionTaken, setActionTaken] = useState('Repaired');
    const [materialsUsed, setMaterialsUsed] = useState('');
    
    // File upload
    const [evidenceFile, setEvidenceFile] = useState(null);
    const [evidencePreview, setEvidencePreview] = useState(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchIssue = async () => {
            try {
                const res = await api.get(`/issues/${id}`);
                setIssue(res.data);
            } catch (err) {
                console.error(err);
                alert("Failed to load task for execution");
                navigate('/worker/tasks');
            } finally {
                setLoading(false);
            }
        };
        fetchIssue();
    }, [id, navigate]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEvidenceFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setEvidencePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStartWork = async () => {
        try {
            await api.patch(`/issues/${id}/start`);
            setCurrentStep(2);
        } catch (err) {
            console.error(err);
            alert("Failed to start work");
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('resolutionNotes', `${actionTaken}: ${resolutionNotes}\nMaterials: ${materialsUsed}`);
            if (evidenceFile) {
                formData.append('proof', evidenceFile);
            }
            
            await api.patch(`/issues/${id}/resolve`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setCurrentStep(4);
        } catch (err) {
            console.error(err);
            alert("Failed to resolve task");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="w-page-wrapper flex justify-center items-center h-full">
            <div className="text-xl text-blue-600 font-semibold">Loading execution wizard...</div>
        </div>
    );

    return (
        <div className="w-page-wrapper" style={{ backgroundColor: '#f9fafb', padding: '1.5rem', minHeight: '100vh' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <button 
                        className="w-btn w-btn-ghost" 
                        style={{ padding: '0', marginBottom: '1rem', color: 'var(--w-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}
                        onClick={() => navigate(`/worker/tasks/${id}`)}
                    >
                        <span>←</span> Back to Task Details
                    </button>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--w-neutral-900)' }}>Task Execution</h1>
                    <p style={{ color: 'var(--w-neutral-500)', margin: 0 }}>Step-by-step workflow for logging task completion</p>
                </div>

                {/* Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '16px', left: '20px', right: '20px', height: '2px', backgroundColor: 'var(--w-neutral-200)', zIndex: 0 }}></div>
                    
                    {[
                        { num: 1, label: 'Start Task' },
                        { num: 2, label: 'Update Status' },
                        { num: 3, label: 'Add Evidence' },
                        { num: 4, label: 'Complete' }
                    ].map((step, index) => {
                        const isCompleted = currentStep > step.num;
                        const isCurrent = currentStep === step.num;
                        return (
                            <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, width: '100px' }}>
                                <div style={{ 
                                    width: '32px', height: '32px', borderRadius: '50%', 
                                    backgroundColor: isCompleted || isCurrent ? 'var(--w-primary)' : '#f8fafc',
                                    color: isCompleted || isCurrent ? 'white' : 'var(--w-neutral-400)',
                                    border: isCompleted || isCurrent ? '2px solid var(--w-primary)' : '2px solid var(--w-neutral-300)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', transition: 'all 0.3s ease'
                                }}>
                                    {isCompleted ? '✓' : step.num}
                                </div>
                                <div style={{ 
                                    fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, 
                                    color: isCurrent ? 'var(--w-primary)' : 'var(--w-neutral-500)',
                                    textAlign: 'center'
                                }}>
                                    {step.label}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="w-card" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                    <div className="w-card-body" style={{ padding: '2rem' }}>
                        
                        {/* STEP 1: Start Task */}
                        {currentStep === 1 && (
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📍</div>
                                <h3 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0', color: 'var(--w-neutral-900)' }}>Arrived at location?</h3>
                                <p style={{ color: 'var(--w-neutral-500)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem auto' }}>
                                    Please confirm you have arrived at the task location and are ready to begin work. This will update the task status to "In Progress".
                                </p>
                                <button 
                                    className="w-btn w-btn-primary" 
                                    style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}
                                    onClick={issue.status === 'in_progress' ? () => setCurrentStep(2) : handleStartWork}
                                >
                                    Yes, Start Task
                                </button>
                            </div>
                        )}

                        {/* STEP 2: Details */}
                        {currentStep === 2 && (
                            <div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--w-neutral-900)' }}>
                                    Update Work Details
                                </h3>
                                
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-700)', marginBottom: '0.5rem' }}>Primary Action Taken</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        {['Repaired', 'Replaced', 'Cleaned', 'Inspected'].map(action => (
                                            <div 
                                                key={action}
                                                style={{ 
                                                    padding: '1rem', border: actionTaken === action ? '2px solid var(--w-primary)' : '1px solid var(--w-neutral-200)', 
                                                    borderRadius: '8px', cursor: 'pointer', backgroundColor: actionTaken === action ? '#eff6ff' : 'white',
                                                    fontWeight: actionTaken === action ? 600 : 500, color: actionTaken === action ? 'var(--w-primary)' : 'var(--w-neutral-700)'
                                                }}
                                                onClick={() => setActionTaken(action)}
                                            >
                                                {action}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-700)', marginBottom: '0.5rem' }}>Detailed Resolution Notes</label>
                                    <textarea 
                                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--w-neutral-300)', borderRadius: '8px', resize: 'vertical', minHeight: '100px', fontSize: '0.875rem', fontFamily: 'inherit' }}
                                        placeholder="Describe the exact work you performed to resolve this issue..."
                                        value={resolutionNotes}
                                        onChange={(e) => setResolutionNotes(e.target.value)}
                                    ></textarea>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-neutral-700)', marginBottom: '0.5rem' }}>Materials Used (Optional)</label>
                                    <input 
                                        type="text" 
                                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--w-neutral-300)', borderRadius: '8px', fontSize: '0.875rem' }}
                                        placeholder="e.g. 2 bags of cement, 1 new signpost"
                                        value={materialsUsed}
                                        onChange={(e) => setMaterialsUsed(e.target.value)}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--w-neutral-200)', paddingTop: '1.5rem' }}>
                                    <button className="w-btn w-btn-outline" onClick={() => setCurrentStep(1)}>
                                        Back
                                    </button>
                                    <button 
                                        className="w-btn w-btn-primary" 
                                        onClick={() => setCurrentStep(3)}
                                        disabled={!resolutionNotes.trim()}
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Evidence */}
                        {currentStep === 3 && (
                            <div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--w-neutral-900)' }}>
                                    Add Photographic Evidence
                                </h3>
                                
                                <p style={{ color: 'var(--w-neutral-500)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                                    Upload a clear 'After' photo showing the resolved issue. This serves as your proof of work and is required to close the task.
                                </p>

                                <div style={{ 
                                    border: '2px dashed var(--w-neutral-300)', 
                                    borderRadius: '12px', 
                                    padding: '3rem 2rem', 
                                    textAlign: 'center',
                                    backgroundColor: 'var(--w-neutral-50)',
                                    marginBottom: '2rem',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {evidencePreview ? (
                                        <div style={{ width: '100%' }}>
                                            <img src={evidencePreview} alt="Evidence Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', marginBottom: '1rem', objectFit: 'cover' }} />
                                            <div>
                                                <button className="w-btn w-btn-outline" onClick={() => { setEvidenceFile(null); setEvidencePreview(null); }}>
                                                    Remove Photo
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--w-neutral-400)' }}>📸</div>
                                            <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--w-neutral-800)' }}>Upload After Photo</div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--w-neutral-500)', marginBottom: '1.5rem' }}>PNG, JPG up to 10MB</div>
                                            <input 
                                                type="file" 
                                                id="evidence-upload" 
                                                style={{ display: 'none' }} 
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                            <label htmlFor="evidence-upload" className="w-btn w-btn-primary" style={{ cursor: 'pointer', padding: '0.75rem 1.5rem' }}>
                                                Select Image File
                                            </label>
                                        </>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--w-neutral-200)', paddingTop: '1.5rem' }}>
                                    <button className="w-btn w-btn-outline" onClick={() => setCurrentStep(2)}>
                                        Back
                                    </button>
                                    <button className="w-btn w-btn-primary" onClick={handleSubmit} disabled={!evidenceFile || isSubmitting}>
                                        {isSubmitting ? 'Submitting...' : 'Submit Work'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: Complete */}
                        {currentStep === 4 && (
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '0 auto 1.5rem auto' }}>
                                    ✓
                                </div>
                                <h3 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0', color: 'var(--w-neutral-900)' }}>Task Successfully Completed!</h3>
                                <p style={{ color: 'var(--w-neutral-500)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
                                    Great job! Your work has been logged and the issue is now marked as resolved. The reporting citizen has been notified.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                    <button 
                                        className="w-btn w-btn-outline" 
                                        onClick={() => navigate(`/worker/tasks/${id}`)}
                                    >
                                        View Details
                                    </button>
                                    <button 
                                        className="w-btn w-btn-primary" 
                                        onClick={() => navigate(`/worker/tasks`)}
                                    >
                                        Back to All Tasks
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskExecutionWizard;
