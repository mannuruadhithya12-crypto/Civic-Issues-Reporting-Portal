const fs = require('fs');
const path = require('path');

const dir = __dirname;

const file1 = `import React from 'react';

const CATEGORY_OPTIONS = [
  { id: 'Roads', title: 'Roads', subtext: 'Potholes, damaged roads, road signs', iconColor: '#2563eb', bgColor: '#eff6ff' },
  { id: 'Waste', title: 'Waste', subtext: 'Garbage overflow, illegal dumping', iconColor: '#16a34a', bgColor: '#f0fdf4' },
  { id: 'Electricity', title: 'Electricity', subtext: 'Street lights, power issues', iconColor: '#9333ea', bgColor: '#faf5ff' },
  { id: 'Water', title: 'Water', subtext: 'Water leakage, drainage problems', iconColor: '#0284c7', bgColor: '#f0f9ff' },
  { id: 'Parks', title: 'Parks', subtext: 'Park maintenance, playground issues', iconColor: '#15803d', bgColor: '#f0fdf4' },
  { id: 'Sanitation', title: 'Sanitation', subtext: 'Public toilets, cleanliness', iconColor: '#2563eb', bgColor: '#eff6ff' },
  { id: 'Public Safety', title: 'Public Safety', subtext: 'Safety hazards, dangerous conditions', iconColor: '#dc2626', bgColor: '#fef2f2' },
  { id: 'Other', title: 'Other', subtext: 'Other civic issues', iconColor: '#475569', bgColor: '#f8fafc' }
];

function Step1Category({ formData, updateFormData, nextStep, onCancel }) {
  const handleSelect = (categoryId) => {
    updateFormData({ category: categoryId });
  };

  return (
    <div className="citizen-card-box p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 m-0 mb-1">1. Select Issue Category</h2>
        <p className="text-xs text-slate-500 m-0">Choose the category that best describes the issue you want to report.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {CATEGORY_OPTIONS.map((cat) => {
          const isSelected = formData.category === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => handleSelect(cat.id)}
              className={\`relative flex flex-col items-center text-center p-6 rounded-2xl cursor-pointer transition-all border \${
                isSelected ? 'bg-blue-50 border-blue-600 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'
              }\`}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-2xl font-bold"
                style={{ backgroundColor: cat.bgColor, color: cat.iconColor }}
              >
                {cat.title[0]}
              </div>
              <div className="font-bold text-sm text-slate-900 mb-1">{cat.title}</div>
              <div className="text-xs text-slate-500 leading-snug">{cat.subtext}</div>
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-5 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="text-slate-500 font-semibold text-xs px-4 py-2 hover:bg-slate-100 rounded-xl">
          Cancel
        </button>
        <button
          type="button"
          onClick={nextStep}
          disabled={!formData.category}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm px-7 py-3 rounded-full shadow-md flex items-center gap-2"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default Step1Category;
`;

const file2 = `import React from 'react';

function Step2Details({ formData, updateFormData, nextStep, prevStep }) {
  const handleTitleChange = (e) => {
    updateFormData({ title: e.target.value.slice(0, 100) });
  };

  const handleDescriptionChange = (e) => {
    updateFormData({ description: e.target.value.slice(0, 500) });
  };

  const isValid = formData.title.trim().length > 0 && formData.description.trim().length > 0;

  return (
    <div className="citizen-card-box p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 m-0 mb-1">2. Issue Details</h2>
        <p className="text-xs text-slate-500 m-0">Provide more information about the issue.</p>
      </div>

      <div className="flex flex-col gap-6 mb-8">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-slate-900">Issue Title <span className="text-red-500">*</span></label>
            <span className="text-xs text-slate-400">{formData.title.length}/100</span>
          </div>
          <input
            type="text"
            value={formData.title}
            onChange={handleTitleChange}
            placeholder="Enter a short, descriptive title"
            className="w-full p-3 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-slate-900">Description <span className="text-red-500">*</span></label>
          </div>
          <div className="relative">
            <textarea
              rows="6"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Provide detailed information about the issue, including any relevant observations, impact, or additional context..."
              className="w-full p-3 pb-8 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:border-blue-600 resize-y"
            />
            <div className="absolute bottom-3 right-4 text-xs text-slate-400 pointer-events-none">
              {formData.description.length}/500
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-900 block mb-3">Priority Level</label>
          <div className="grid grid-cols-3 gap-4">
            <div
              onClick={() => updateFormData({ priority: 'high' })}
              className={\`p-4 rounded-xl cursor-pointer text-center transition-all border \${
                formData.priority === 'high' ? 'bg-red-50 border-red-500 shadow-sm' : 'bg-red-50/50 border-red-200'
              }\`}
            >
              <div className="font-extrabold text-xs text-red-600 mb-1">⚠ High</div>
              <div className="text-[11px] text-red-800 leading-tight">Critical issue requiring immediate attention</div>
            </div>

            <div
              onClick={() => updateFormData({ priority: 'normal' })}
              className={\`p-4 rounded-xl cursor-pointer text-center transition-all border \${
                formData.priority === 'normal' || !formData.priority ? 'bg-amber-50 border-amber-500 shadow-sm' : 'bg-amber-50/50 border-amber-200'
              }\`}
            >
              <div className="font-extrabold text-xs text-amber-600 mb-1">⚠ Medium</div>
              <div className="text-[11px] text-amber-800 leading-tight">Needs attention</div>
            </div>

            <div
              onClick={() => updateFormData({ priority: 'low' })}
              className={\`p-4 rounded-xl cursor-pointer text-center transition-all border \${
                formData.priority === 'low' ? 'bg-slate-100 border-slate-500 shadow-sm' : 'bg-slate-50 border-slate-200'
              }\`}
            >
              <div className="font-extrabold text-xs text-slate-600 mb-1">↓ Low</div>
              <div className="text-[11px] text-slate-600 leading-tight">Minor issue</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-5 border-t border-slate-100">
        <button type="button" onClick={prevStep} className="border border-slate-300 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-full">
          ← Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          disabled={!isValid}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm px-7 py-3 rounded-full shadow-md flex items-center gap-2"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default Step2Details;
`;

const file3 = `import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position ? <Marker position={position} icon={blueIcon} draggable={true} eventHandlers={{ dragend: (e) => setPosition(e.target.getLatLng()) }} /> : null;
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15, { animate: true });
  }, [center, map]);
  return null;
}

function Step3Location({ formData, updateFormData, nextStep, prevStep }) {
  const defaultCenter = { lat: 12.9716, lng: 77.5946 };
  const [position, setPosition] = useState(
    formData.coordinates && formData.coordinates.lat
      ? { lat: formData.coordinates.lat, lng: formData.coordinates.lng }
      : defaultCenter
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!position) return;
    updateFormData({ coordinates: { lat: position.lat, lng: position.lng } });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${position.lat}&lon=\${position.lng}\`);
        const data = await res.json();
        if (data && data.display_name) {
          updateFormData({ locationName: data.display_name });
        }
      } catch (err) {}
    }, 400);
    return () => clearTimeout(timer);
  }, [position]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(searchQuery.trim())}\`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition({ lat, lng });
        updateFormData({ locationName: data[0].display_name, coordinates: { lat, lng } });
      }
    } catch (err) {} finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="citizen-card-box p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 m-0 mb-1">3. Set Location</h2>
        <p className="text-xs text-slate-500 m-0">Specify the exact location of the issue on the map or search for an address.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for an address or place..."
          className="flex-1 p-3 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none"
        />
        <button type="submit" disabled={isSearching} className="bg-blue-600 text-white font-bold text-xs px-5 rounded-xl">
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="h-80 w-full rounded-2xl overflow-hidden border border-slate-300 relative mb-4">
        <MapContainer center={[position.lat, position.lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
          <LocationPicker position={position} setPosition={setPosition} />
          <MapUpdater center={[position.lat, position.lng]} />
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-900 block mb-1">Selected Location *</label>
          <input
            type="text"
            value={formData.locationName || ''}
            onChange={(e) => updateFormData({ locationName: e.target.value })}
            placeholder="Enter the complete address"
            className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-900 block mb-1">Coordinates</label>
          <div className="text-xs text-slate-600 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-5 border-t border-slate-100">
        <button type="button" onClick={prevStep} className="border border-slate-300 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-full">
          ← Back
        </button>
        <button type="button" onClick={nextStep} className="bg-blue-600 text-white font-bold text-sm px-7 py-3 rounded-full shadow-md">
          Next →
        </button>
      </div>
    </div>
  );
}

export default Step3Location;
`;

const file4 = `import React, { useState, useRef } from 'react';

function Step4Evidence({ formData, updateFormData, nextStep, prevStep }) {
  const fileInputRef = useRef(null);

  const processFiles = (files) => {
    if (!files || files.length === 0) return;
    const maxFiles = 5;
    const currentCount = formData.images ? formData.images.length : 0;
    const allowed = maxFiles - currentCount;
    if (allowed <= 0) return;

    const validFiles = Array.from(files).filter(f => f.size <= 5 * 1024 * 1024).slice(0, allowed);
    const newPreviews = validFiles.map(f => URL.createObjectURL(f));

    updateFormData({
      images: [...(formData.images || []), ...validFiles],
      imagePreviews: [...(formData.imagePreviews || []), ...newPreviews]
    });
  };

  const removeImage = (idx) => {
    const newImgs = [...formData.images];
    const newPrevs = [...formData.imagePreviews];
    newImgs.splice(idx, 1);
    newPrevs.splice(idx, 1);
    updateFormData({ images: newImgs, imagePreviews: newPrevs });
  };

  return (
    <div className="citizen-card-box p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 m-0 mb-1">4. Upload Evidence</h2>
        <p className="text-xs text-slate-500 m-0">Add photos or other evidence to help authorities understand the issue.</p>
      </div>

      <div
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-10 text-center cursor-pointer mb-8 flex flex-col items-center"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => processFiles(e.target.files)}
          multiple
          accept="image/*"
          className="hidden"
        />
        <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl mb-3">
          +
        </div>
        <div className="font-bold text-sm text-slate-900 mb-1">Click to upload photos or drag and drop</div>
        <div className="text-xs text-slate-500">Supports JPG, PNG (Max 5MB each, up to 5 files)</div>
      </div>

      <div className="mb-8">
        <div className="text-xs font-bold text-slate-900 mb-3">Uploaded Photos ({(formData.images || []).length}/5)</div>
        <div className="grid grid-cols-5 gap-3">
          {(formData.imagePreviews || []).map((url, idx) => (
            <div key={idx} className="relative h-24 rounded-xl overflow-hidden border border-slate-200">
              <img src={url} alt="Evidence preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-5 border-t border-slate-100">
        <button type="button" onClick={prevStep} className="border border-slate-300 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-full">
          ← Back
        </button>
        <button type="button" onClick={nextStep} className="bg-blue-600 text-white font-bold text-sm px-7 py-3 rounded-full shadow-md">
          Next →
        </button>
      </div>
    </div>
  );
}

export default Step4Evidence;
`;

const file5 = `import React, { useState } from 'react';

function Step5Review({ formData, submitIssue, prevStep, goToStep, loading }) {
  const [consentChecked, setConsentChecked] = useState(true);

  return (
    <div className="citizen-card-box p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 m-0 mb-1">5. Review & Submit</h2>
        <p className="text-xs text-slate-500 m-0">Please review your issue details before submitting.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="font-extrabold text-sm text-slate-900">Issue Summary</span>
            <button type="button" onClick={() => goToStep(1)} className="text-blue-600 font-bold text-xs">Edit</button>
          </div>

          <div className="grid grid-cols-3 text-xs">
            <span className="text-slate-500 font-semibold">Category</span>
            <span className="col-span-2 font-bold text-slate-900">{formData.category}</span>
          </div>

          <div className="grid grid-cols-3 text-xs">
            <span className="text-slate-500 font-semibold">Title</span>
            <span className="col-span-2 font-bold text-slate-900">{formData.title || 'N/A'}</span>
          </div>

          <div className="grid grid-cols-3 text-xs">
            <span className="text-slate-500 font-semibold">Description</span>
            <span className="col-span-2 text-slate-700 leading-relaxed">{formData.description || 'N/A'}</span>
          </div>

          <div className="grid grid-cols-3 text-xs">
            <span className="text-slate-500 font-semibold">Location</span>
            <span className="col-span-2 font-bold text-slate-900">{formData.locationName || 'Pinned on map'}</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex flex-col gap-3">
          <label className="flex items-start gap-2 cursor-pointer text-xs font-bold text-blue-900">
            <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-0.5" />
            By submitting this issue, you agree that information provided is accurate and evidence may be shared with authorities.
          </label>
        </div>
      </div>

      <div className="flex justify-between items-center pt-5 border-t border-slate-100">
        <button type="button" onClick={prevStep} disabled={loading} className="border border-slate-300 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-full">
          ← Back
        </button>
        <button type="button" onClick={submitIssue} disabled={!consentChecked || loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm px-8 py-3 rounded-full shadow-md">
          {loading ? 'Submitting...' : 'Submit Issue'}
        </button>
      </div>
    </div>
  );
}

export default Step5Review;
`;

const file6 = `import React from 'react';
import { useNavigate } from 'react-router-dom';

function Step6Success({ submittedIssue, onReportAnother }) {
  const navigate = useNavigate();
  const issueId = submittedIssue && submittedIssue._id ? \`#CC-\${submittedIssue._id.substring(submittedIssue._id.length - 6).toUpperCase()}\` : '#CC-2026-0001';

  return (
    <div className="citizen-card-box p-12 text-center flex flex-col items-center max-w-xl mx-auto">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 font-extrabold text-2xl flex items-center justify-center mb-5">
        ✓
      </div>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Issue Reported Successfully</h2>
      <p className="text-xs text-slate-500 mb-8">Thank you for helping improve your community.</p>

      <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left flex flex-col gap-3 mb-8 text-xs">
        <div className="flex justify-between border-b border-slate-200 pb-2">
          <span className="text-slate-500 font-semibold">Issue Reference ID</span>
          <span className="font-extrabold text-blue-600 font-mono">{issueId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 font-semibold">Category</span>
          <span className="font-bold text-slate-900">{submittedIssue?.department || 'General'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 font-semibold">Status</span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px]">Reported</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => navigate('/issues')} className="bg-blue-600 text-white font-bold text-xs px-6 py-3 rounded-full">
          View My Issues
        </button>
        <button type="button" onClick={onReportAnother} className="border border-blue-600 text-blue-600 font-bold text-xs px-6 py-3 rounded-full">
          + Report Another
        </button>
        <button type="button" onClick={() => navigate('/')} className="bg-slate-100 text-slate-700 font-bold text-xs px-6 py-3 rounded-full">
          Home
        </button>
      </div>
    </div>
  );
}

export default Step6Success;
`;

fs.writeFileSync(path.join(dir, 'Step1Category.js'), file1, 'utf8');
fs.writeFileSync(path.join(dir, 'Step2Details.js'), file2, 'utf8');
fs.writeFileSync(path.join(dir, 'Step3Location.js'), file3, 'utf8');
fs.writeFileSync(path.join(dir, 'Step4Evidence.js'), file4, 'utf8');
fs.writeFileSync(path.join(dir, 'Step5Review.js'), file5, 'utf8');
fs.writeFileSync(path.join(dir, 'Step6Success.js'), file6, 'utf8');

console.log('All step files written successfully!');
