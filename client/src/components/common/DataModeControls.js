import React from 'react';
import { useDataMode } from '../../context/DataModeContext';

export const DemoDataBanner = () => {
    const { isDemoMode, setDataMode } = useDataMode();

    if (!isDemoMode) return null;

    return (
        <div style={{
            backgroundColor: '#f59e0b',
            color: '#78350f',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #d97706',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            zIndex: 1000
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>⚠️</span>
                <span><strong>DEMO DATA MODE ACTIVE:</strong> You are viewing isolated demonstration datasets. Actions in Demo Mode will NOT enter live MongoDB production collections or affect real municipal workflows.</span>
            </div>
            <button
                onClick={() => setDataMode('live')}
                style={{
                    backgroundColor: '#ffffff',
                    color: '#78350f',
                    border: '1px solid #d97706',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                }}
            >
                Switch to Live Mode
            </button>
        </div>
    );
};

export const DataModeToggle = () => {
    const { dataMode, setDataMode } = useDataMode();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1'
        }}>
            <button
                onClick={() => setDataMode('live')}
                style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: dataMode === 'live' ? '#10b981' : 'transparent',
                    color: dataMode === 'live' ? '#ffffff' : '#64748b',
                    transition: 'all 0.2s'
                }}
                title="Live Data Mode: Real MongoDB records & operations"
            >
                🟢 Live Mode
            </button>

            <button
                onClick={() => setDataMode('demo')}
                style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: dataMode === 'demo' ? '#f59e0b' : 'transparent',
                    color: dataMode === 'demo' ? '#78350f' : '#64748b',
                    transition: 'all 0.2s'
                }}
                title="Demo Mode: Deterministic isolated demonstration records"
            >
                🧪 Demo Mode
            </button>
        </div>
    );
};
