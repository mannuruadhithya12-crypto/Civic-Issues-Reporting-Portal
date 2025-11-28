import React from 'react';

function ImageViewer({ images, currentIndex, onClose, onNext, onPrev }) {
    if (!images || images.length === 0) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const currentImage = images[currentIndex];
    const showNav = images.length > 1;

    return (
        <div className="image-viewer-overlay" onClick={handleOverlayClick}>
            <div className="image-viewer-content">
                <img
                    src={currentImage}
                    alt={`View ${currentIndex + 1} of ${images.length}`}
                />

                {showNav && (
                    <>
                        <button
                            className="image-viewer-nav prev"
                            onClick={onPrev}
                            disabled={currentIndex === 0}
                        >
                            ‹
                        </button>
                        <button
                            className="image-viewer-nav next"
                            onClick={onNext}
                            disabled={currentIndex === images.length - 1}
                        >
                            ›
                        </button>
                    </>
                )}

                <button className="image-viewer-close" onClick={onClose}>
                    ×
                </button>

                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'white',
                    fontSize: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px'
                }}>
                    {currentIndex + 1} / {images.length}
                </div>
            </div>
        </div>
    );
}

export default ImageViewer;
