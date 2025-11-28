import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import { CATEGORIES, CATEGORY_ICONS } from "../components/CategoryCard";

function SubmitIssue() {
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-detect category from navigation state
  const preSelectedCategory = location.state?.category || CATEGORIES[0];
  const isEmergency = location.state?.isEmergency || false;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(preSelectedCategory);
  const [priority, setPriority] = useState(isEmergency ? 'urgent' : 'normal');

  // Update priority when emergency state changes
  useEffect(() => {
    setPriority(location.state?.isEmergency ? 'urgent' : 'normal');
  }, [location.state?.isEmergency]);

  const [locationStr, setLocationStr] = useState("");
  const [locationName, setLocationName] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Auto-capture geolocation on component mount
    captureLocation();
  }, []);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoordinates(coords);
        setLocationStr(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setGettingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert("Location permission denied. You can still submit without location.");
        }
      }
    );
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      alert("You can only upload up to 5 images");
      return;
    }

    setImages([...images, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      alert("Could not access camera: " + err.message);
    }
  };

  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setImages([...images, file]);
        setImagePreviews([...imagePreviews, canvas.toDataURL()]);
        stopCamera();
      }, 'image/jpeg');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert("Please provide a title and description.");
      return;
    }

    if (!locationName && !locationStr.trim()) {
      alert("Please provide a location.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('department', category);
      formData.append('priority', priority);
      formData.append('location', locationName || locationStr);
      if (coordinates) {
        formData.append('coordinates', JSON.stringify(coordinates));
      }
      images.forEach(image => {
        formData.append('images', image);
      });

      await api.post("/issues", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert("Issue submitted!");
      setTitle("");
      setDescription("");
      setLocationStr("");
      setLocationName("");
      setCoordinates(null);
      setImages([]);
      setImagePreviews([]);
      navigate("/issues");
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to submit. Check console.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Submit New Issue</h2>

      {/* Emergency Banner */}
      {isEmergency && (
        <div style={{
          background: 'linear-gradient(135deg, #f44336, #d32f2f)',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '2px solid #c62828',
          boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
          animation: 'pulse-red 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>🚨</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                EMERGENCY REPORT
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.95 }}>
                This issue will be marked as URGENT priority and appear at the top of all lists for immediate attention.
              </div>
            </div>
          </div>
        </div>
      )}

      {gettingLocation && (
        <p style={{ color: 'var(--primary)' }}>📍 Getting your location...</p>
      )}
      {locationName && (
        <p style={{ color: 'var(--secondary)', fontSize: '0.9em' }}>
          📍 Location: {locationName}
        </p>
      )}
      <form className="form" onSubmit={handleSubmit}>
        <div>
          <label>Category</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2rem' }}>{CATEGORY_ICONS[category]}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ flex: 1 }}
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          {location.state?.category && (
            <p style={{ fontSize: '0.85em', color: 'var(--primary)', marginTop: '0.25rem' }}>
              ✓ Auto-selected from home page
            </p>
          )}
        </div>
        <div>
          <label>Issue Title</label>
          <input
            type="text"
            placeholder="e.g., Pothole on Main Street"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Description</label>
          <textarea
            placeholder="Describe the issue in detail"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Location</label>
          <input
            type="text"
            placeholder="Location (auto-filled or enter manually)"
            value={locationStr}
            onChange={(e) => setLocationStr(e.target.value)}
          />
          {coordinates && (
            <p style={{ fontSize: '0.85em', color: 'var(--secondary)', marginTop: '0.5rem' }}>
              ✓ Coordinates: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </p>
          )}
        </div>

        <div>
          <label>Photos (up to 5)</label>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button type="button" onClick={startCamera}>
              📷 Take Photo
            </button>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="file-upload"
                accept="image/*"
                multiple
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="file-input-label">
                📁 Upload Photos
              </label>
            </div>
          </div>

          {showCamera && (
            <div style={{ marginBottom: '1rem' }}>
              <video ref={videoRef} autoPlay style={{ width: '100%', maxWidth: '300px', borderRadius: '8px' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={capturePhoto}>Capture</button>
                <button type="button" onClick={stopCamera}>Cancel</button>
              </div>
            </div>
          )}

          {imagePreviews.length > 0 && (
            <div className="image-preview">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="image-preview-item">
                  <img src={preview} alt={`Preview ${index + 1}`} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                  <button type="button" onClick={() => removeImage(index)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={captureLocation}
          disabled={gettingLocation}
        >
          {gettingLocation ? "Getting Location..." : "📍 Update Location"}
        </button>
        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Issue"}
        </button>
      </form>
    </div>
  );
}

export default SubmitIssue;
