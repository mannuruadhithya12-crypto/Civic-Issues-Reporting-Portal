import React, { useState } from 'react';
import api from '../../services/api';
import Card from '../common/Card';
import Button from '../common/Button';

const TaskExecution = ({ issue, isOpen, onClose, onSuccess }) => {
    const [proofFile, setProofFile] = useState(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !issue) return null;

    const handleResolve = async (e) => {
        e.preventDefault();
        if (!proofFile && !resolutionNotes.trim()) {
            alert("Please provide either a proof photo or resolution notes.");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        if (proofFile) formData.append('proof', proofFile);
        if (resolutionNotes) formData.append('resolutionNotes', resolutionNotes);

        try {
            await api.patch(`/issues/${issue._id}/resolve`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Issue marked as resolved! Pending citizen verification.");
            setProofFile(null);
            setResolutionNotes('');
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to submit resolution");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <Card className="w-full max-w-lg shadow-2xl relative">
                {/* Close button */}
                <button 
                    onClick={() => { onClose(); setProofFile(null); setResolutionNotes(''); }}
                    className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-fast p-1"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>

                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-text-primary pr-8 mb-2">Resolve Issue</h3>
                    <p className="text-text-secondary font-medium">"{issue.title}"</p>
                    <p className="text-text-tertiary mt-2 text-sm">Please upload a photo proof or add notes showing the completed resolution.</p>
                </div>

                {/* Before Evidence */}
                {issue.images && issue.images.length > 0 && (
                    <div className="mb-6 bg-surface p-4 rounded-lg border border-light">
                        <h4 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">Before Evidence</h4>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {issue.images.map((img, idx) => (
                                <img 
                                    key={idx} 
                                    src={img.startsWith('http') ? img : `http://localhost:5000${img}`} 
                                    alt="Before evidence" 
                                    className="h-24 w-24 object-cover rounded-md border border-light shrink-0" 
                                />
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleResolve} className="space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">After Evidence</h4>
                        <div className="border-2 border-dashed border-light hover:border-primary-300 transition-fast rounded-xl p-6 bg-surface text-center">
                            <input
                                type="file"
                                accept="image/*"
                                id="proof-upload"
                                onChange={e => setProofFile(e.target.files[0])}
                                className="hidden"
                            />
                        <label 
                            htmlFor="proof-upload"
                            className="cursor-pointer flex flex-col items-center gap-3"
                        >
                            <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center text-xl">
                                📸
                            </div>
                            <div>
                                <span className="text-primary-600 font-semibold hover:text-primary-700">Click to upload proof</span>
                                <p className="text-text-tertiary text-xs mt-1">JPEG, PNG, JPG up to 5MB</p>
                            </div>
                        </label>
                    </div>

                    {proofFile && (
                        <div className="relative rounded-lg overflow-hidden border border-light mt-4">
                            <img
                                src={URL.createObjectURL(proofFile)}
                                alt="Preview"
                                className="w-full max-h-48 object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-between p-3">
                                <span className="text-white text-sm font-medium truncate">{proofFile.name}</span>
                                <button 
                                    type="button" 
                                    onClick={() => setProofFile(null)} 
                                    className="bg-danger text-white rounded-full p-1 text-xs hover:bg-danger-600 transition-fast"
                                    title="Remove image"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">Resolution Notes</h4>
                        <textarea
                            value={resolutionNotes}
                            onChange={e => setResolutionNotes(e.target.value)}
                            placeholder="Describe how the issue was resolved..."
                            className="w-full p-3 rounded-lg border border-light focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-fast resize-none h-24"
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-light">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => { onClose(); setProofFile(null); setResolutionNotes(''); }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={(!proofFile && !resolutionNotes.trim()) || isSubmitting}
                            className="min-w-[120px]"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Proof'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default TaskExecution;
