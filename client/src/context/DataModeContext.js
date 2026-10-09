import React, { createContext, useState, useContext, useEffect } from 'react';

const DataModeContext = createContext();

export const DataModeProvider = ({ children }) => {
    const [dataMode, setDataModeState] = useState(() => {
        return localStorage.getItem('dataMode') || 'live';
    });

    const setDataMode = (mode) => {
        if (mode === 'demo' || mode === 'live') {
            localStorage.setItem('dataMode', mode);
            setDataModeState(mode);
            // Trigger a clean window custom event for components to refetch if needed
            window.dispatchEvent(new CustomEvent('dataModeChanged', { detail: mode }));
        }
    };

    const isDemoMode = dataMode === 'demo';

    return (
        <DataModeContext.Provider value={{ dataMode, setDataMode, isDemoMode }}>
            {children}
        </DataModeContext.Provider>
    );
};

export const useDataMode = () => {
    const context = useContext(DataModeContext);
    if (!context) {
        return { dataMode: 'live', setDataMode: () => {}, isDemoMode: false };
    }
    return context;
};

export default DataModeContext;
