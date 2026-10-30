import '@testing-library/jest-dom';
import React from 'react';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock leaflet
jest.mock('leaflet', () => {
  const L = {
    Icon: function() {
      return {};
    },
    divIcon: jest.fn(() => ({})),
    latLng: (lat, lng) => ({ lat, lng }),
    latLngBounds: () => ({
      isValid: () => true,
      pad: () => ({}),
    }),
  };
  L.Icon.Default = function() {};
  L.Icon.Default.prototype = { _getIconUrl: jest.fn() };
  L.Icon.Default.mergeOptions = jest.fn();
  return L;
});

// Mock react-leaflet
jest.mock('react-leaflet', () => {
  const React = require('react');
  return {
    MapContainer: ({ children, center, zoom, style, className, scrollWheelZoom, ...props }) =>
      React.createElement('div', { 'data-testid': 'map-container', className, style }, children),
    TileLayer: () =>
      React.createElement('div', { 'data-testid': 'tile-layer' }),
    Marker: ({ children, position, icon, draggable, eventHandlers, ...props }) =>
      React.createElement('div', { 'data-testid': 'map-marker' }, children),
    Popup: ({ children, ...props }) =>
      React.createElement('div', { 'data-testid': 'map-popup' }, children),
    Circle: ({ children, center, radius, pathOptions, eventHandlers, ...props }) =>
      React.createElement('div', { 'data-testid': 'map-circle' }, children),
    CircleMarker: ({ children, center, radius, pathOptions, eventHandlers, ...props }) =>
      React.createElement('div', { 'data-testid': 'map-circle-marker' }, children),
    Polygon: ({ children, positions, pathOptions, ...props }) =>
      React.createElement('div', { 'data-testid': 'map-polygon' }, children),
    useMap: () => ({
      flyTo: jest.fn(),
      setView: jest.fn(),
      getZoom: () => 13,
    }),
    useMapEvents: () => ({}),
  };
});

// Mock react-leaflet-cluster
jest.mock('react-leaflet-cluster', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement('div', { 'data-testid': 'marker-cluster', ...props }, children),
  };
});


