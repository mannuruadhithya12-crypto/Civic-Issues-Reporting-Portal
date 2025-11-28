import React, { createContext, useState, useEffect, useContext } from 'react';

export const ThemeContext = createContext();

const THEMES = {
    Blue: {
        name: 'Blue',
        gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
        accent: '#06b6d4'
    },
    Dark: {
        name: 'Dark',
        gradient: 'linear-gradient(135deg, #111827, #0f172a)',
        accent: '#60a5fa'
    }
};

export const ThemeProvider = ({ children }) => {
    const [themeName, setThemeName] = useState(() => {
        // Load theme from localStorage or default to 'Blue'
        return localStorage.getItem('theme') || 'Blue';
    });

    const theme = THEMES[themeName] || THEMES.Blue;

    useEffect(() => {
        // Apply theme to body element
        document.body.setAttribute('data-theme', themeName);

        // Save theme to localStorage
        localStorage.setItem('theme', themeName);
    }, [themeName]);

    const switchTheme = (newTheme) => {
        if (THEMES[newTheme]) {
            setThemeName(newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={{ themeName, theme, switchTheme, themes: THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
