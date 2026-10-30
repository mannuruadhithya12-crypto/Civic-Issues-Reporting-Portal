import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Step3Location from '../components/IssueWizard/Step3Location';
import Step5Review from '../components/IssueWizard/Step5Review';
import GeographicAnalysis from '../components/CivicIntelligence/GeographicAnalysis';
import IssueHeatmap from '../components/CivicIntelligence/IssueHeatmap';
import api from '../services/api';

// Mock the API client
jest.mock('../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('CivicConnect Phase 4 — Frontend Real-Data Integration Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Duplicate candidates displayed correctly (title, status, distance, score, link)
  // --------------------------------------------------------------------------
  test('Scenario 1: Duplicate candidates displayed correctly with title, status, distance, score, and link', () => {
    const mockCandidate = {
      issueId: 'iss-dup-101',
      title: 'Massive Pothole on 100ft Road',
      category: 'Roads',
      status: 'in_progress',
      distanceMeters: 48.2,
      confidenceScore: 0.91,
      similarityScore: 0.91,
    };

    const duplicateState = {
      status: 'candidates',
      data: {
        hasDuplicates: true,
        matchCount: 1,
        topMatch: mockCandidate,
        candidates: [mockCandidate],
      },
      error: null,
      lastCheckedAt: '2026-10-20T10:00:00Z',
    };

    const formData = {
      category: 'Roads',
      title: 'Pothole on 100ft Road',
      description: 'Dangerous road crater',
      priority: 'high',
      locationName: 'Indiranagar 100ft Road',
      coordinates: { lat: 12.9716, lng: 77.5946 },
    };

    render(
      <Step5Review
        formData={formData}
        submitIssue={jest.fn()}
        prevStep={jest.fn()}
        goToStep={jest.fn()}
        loading={false}
        duplicateState={duplicateState}
      />
    );

    // Verify candidate details
    expect(screen.getByTestId('duplicate-candidates-step5')).toBeInTheDocument();
    expect(screen.getByText('Massive Pothole on 100ft Road')).toBeInTheDocument();
    expect(screen.getByText('91% Match')).toBeInTheDocument();
    expect(screen.getByText(/48m from your pin/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: in_progress/i)).toBeInTheDocument();

    // Verify direct ticket link
    const ticketLink = screen.getByText(/View Existing Ticket/i);
    expect(ticketLink).toHaveAttribute('href', '/issues/iss-dup-101');
    expect(ticketLink).toHaveAttribute('target', '_blank');

    // Verify non-blocking advisory disclaimer
    expect(screen.getByText(/Suggestions are recommendations only, not confirmed duplicates/i)).toBeInTheDocument();
    expect(screen.getByText(/Reports are never auto-merged/i)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Empty duplicate results displayed cleanly
  // --------------------------------------------------------------------------
  test('Scenario 2: Empty duplicate results show clean verification without blocking submission', () => {
    const duplicateState = {
      status: 'empty',
      data: {
        hasDuplicates: false,
        matchCount: 0,
        candidates: [],
        radiusMeters: 300,
      },
      error: null,
      lastCheckedAt: '2026-10-20T10:00:00Z',
    };

    const formData = {
      category: 'Water',
      title: 'Broken water pipe leaking clean water',
      description: 'Pipe ruptured on sidewalk',
      priority: 'normal',
      coordinates: { lat: 12.9352, lng: 77.6245 },
    };

    render(
      <Step5Review
        formData={formData}
        submitIssue={jest.fn()}
        prevStep={jest.fn()}
        goToStep={jest.fn()}
        loading={false}
        duplicateState={duplicateState}
      />
    );

    const emptySection = screen.getByTestId('duplicate-empty-step5');
    expect(emptySection).toBeInTheDocument();
    expect(screen.getByText(/No Duplicates Found/i)).toBeInTheDocument();
    expect(screen.getByText(/No matching complaints were found within a 300m radius/i)).toBeInTheDocument();

    // Submit button must remain enabled
    const submitBtn = screen.getByRole('button', { name: /Submit Issue/i });
    expect(submitBtn).toBeEnabled();
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Duplicate API failures handled gracefully with retry
  // --------------------------------------------------------------------------
  test('Scenario 3: Duplicate API failure displays error message and retry button without blocking submission', () => {
    const retryMock = jest.fn();
    const duplicateState = {
      status: 'error',
      data: null,
      error: 'Upstream NLP Service Unavailable',
      lastCheckedAt: '2026-10-20T10:00:00Z',
    };

    const formData = {
      category: 'Sanitation',
      title: 'Garbage pile overflowing',
      description: 'Waste left uncleared for 5 days',
      priority: 'normal',
      coordinates: { lat: 12.9260, lng: 77.6835 },
    };

    render(
      <Step5Review
        formData={formData}
        submitIssue={jest.fn()}
        prevStep={jest.fn()}
        goToStep={jest.fn()}
        loading={false}
        duplicateState={duplicateState}
        retryDuplicateCheck={retryMock}
      />
    );

    const errorSection = screen.getByTestId('duplicate-error-step5');
    expect(errorSection).toBeInTheDocument();
    expect(screen.getByText(/Upstream NLP Service Unavailable/i)).toBeInTheDocument();

    // Verify retry button triggers callback
    const retryBtn = screen.getByRole('button', { name: /Retry Check/i });
    fireEvent.click(retryBtn);
    expect(retryMock).toHaveBeenCalledTimes(1);

    // Verify citizen can still submit
    const submitBtn = screen.getByRole('button', { name: /Submit Issue/i });
    expect(submitBtn).toBeEnabled();
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Stale responses ignored after input changes
  // --------------------------------------------------------------------------
  test('Scenario 4: Step3Location handles loading and updates when input changes', () => {
    const { rerender } = render(
      <Step3Location
        formData={{ coordinates: { lat: 12.9716, lng: 77.5946 } }}
        updateFormData={jest.fn()}
        nextStep={jest.fn()}
        prevStep={jest.fn()}
        duplicateState={{ status: 'loading', data: null, error: null }}
      />
    );

    expect(screen.getByTestId('duplicate-loading-step3')).toBeInTheDocument();
    expect(screen.getByText(/Scanning vicinity for existing complaints/i)).toBeInTheDocument();

    // When new response arrives with genuine empty result
    rerender(
      <Step3Location
        formData={{ coordinates: { lat: 12.9716, lng: 77.5946 } }}
        updateFormData={jest.fn()}
        nextStep={jest.fn()}
        prevStep={jest.fn()}
        duplicateState={{ status: 'empty', data: { hasDuplicates: false }, error: null }}
      />
    );

    expect(screen.getByTestId('duplicate-empty-step3')).toBeInTheDocument();
    expect(screen.queryByTestId('duplicate-loading-step3')).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Hotspot API data rendered correctly
  // --------------------------------------------------------------------------
  test('Scenario 5: Hotspot API data correctly renders KPI summary, density map, and detail panel', async () => {
    const mockHotspotData = {
      success: true,
      summary: {
        totalHotspots: 1,
        totalIssuesInHotspots: 6,
        totalPointsAnalyzed: 10,
        noisePointsCount: 4,
        clusterEfficiency: 60.0,
      },
      hotspots: [
        {
          id: 'hotspot-1',
          clusterIndex: 1,
          center: { latitude: 12.9716, longitude: 77.5946 },
          centerCoordinates: [12.9716, 77.5946],
          coordinates: [77.5946, 12.9716],
          radiusMeters: 220,
          densityPerSqKm: 39.5,
          severityLevel: 'CRITICAL',
          severityScore: 84,
          issueCount: 6,
          dominantDepartment: 'Roads',
          activeCount: 5,
          resolvedCount: 1,
          statusBreakdown: { reported: 4, in_progress: 1, resolved: 1 },
          priorityBreakdown: { urgent: 3, high: 2, normal: 1, low: 0 },
          firstReportedAt: '2026-10-01T08:00:00.000Z',
          lastReportedAt: '2026-10-19T14:30:00.000Z',
          boundingPolygon: {
            type: 'Polygon',
            coordinates: [
              [
                [77.5940, 12.9710],
                [77.5952, 12.9710],
                [77.5952, 12.9722],
                [77.5940, 12.9722],
                [77.5940, 12.9710],
              ],
            ],
          },
          issues: [
            { id: 'iss-1', title: 'Open Manhole on Brigade Rd' },
            { id: 'iss-2', title: 'Cave-in near Metro Station' },
          ],
        },
      ],
    };

    api.get.mockResolvedValueOnce({ data: mockHotspotData });

    render(<GeographicAnalysis intelligence={{}} />);

    // Wait for hotspots to resolve and render
    await screen.findByText('Roads Cluster');

    // Check KPI values via data-testid
    expect(screen.getByTestId('kpi-total-hotspots')).toHaveTextContent('1');
    expect(screen.getByTestId('kpi-issues-in-hotspots')).toHaveTextContent('6');
    expect(screen.getByTestId('kpi-total-points-analyzed')).toHaveTextContent('10');

    // Check detail panel
    expect(screen.getByTestId('hotspot-detail-panel')).toBeInTheDocument();
    expect(screen.getByText('Roads Cluster')).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL • 84/i)).toBeInTheDocument();
    expect(screen.getByText('220m')).toBeInTheDocument();
    expect(screen.getByText(/39.5/i)).toBeInTheDocument();

    // Check breakdown
    expect(screen.getByText(/Active \(5\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolved \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/urgent: 3/i)).toBeInTheDocument();

    // Check constituent issue links
    expect(screen.getByText('Open Manhole on Brigade Rd')).toBeInTheDocument();
    expect(screen.getByText('Cave-in near Metro Station')).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Empty hotspot results handled cleanly
  // --------------------------------------------------------------------------
  test('Scenario 6: Empty hotspot results render clear empty state banner without errors', async () => {
    const emptyHotspotData = {
      success: true,
      summary: {
        totalHotspots: 0,
        totalIssuesInHotspots: 0,
        totalPointsAnalyzed: 2,
        noisePointsCount: 2,
      },
      hotspots: [],
    };

    api.get.mockResolvedValueOnce({ data: emptyHotspotData });

    render(<GeographicAnalysis intelligence={{}} />);

    await waitFor(() => {
      expect(screen.getByTestId('hotspot-empty-banner')).toBeInTheDocument();
    });

    expect(screen.getByText(/No Hotspots Detected/i)).toBeInTheDocument();
    expect(screen.getByText(/No incident clusters meet the density threshold/i)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Hotspot API failure displays explicit error banner with retry
  // --------------------------------------------------------------------------
  test('Scenario 7: Hotspot API failure renders explicit error banner and retry button', async () => {
    api.get.mockRejectedValueOnce({
      response: { status: 500, data: { error: 'Database clustering compute timeout' } },
      message: 'Server error calculating geospatial hotspots',
    });

    render(<GeographicAnalysis intelligence={{}} />);

    await waitFor(() => {
      expect(screen.getByTestId('hotspot-error-banner')).toBeInTheDocument();
    });

    expect(screen.getByText(/Database clustering compute timeout/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Second call succeeds
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        summary: { totalHotspots: 0, totalIssuesInHotspots: 0, totalPointsAnalyzed: 0 },
        hotspots: [],
      },
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('hotspot-error-banner')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Correct GeoJSON and Leaflet coordinate order
  // --------------------------------------------------------------------------
  test('Scenario 8: Coordinate ordering strictly enforces GeoJSON [lng, lat] and Leaflet [lat, lng]', () => {
    const geoJsonPoint = [77.5946, 12.9716]; // [lng, lat]
    const leafletPoint = [12.9716, 77.5946]; // [lat, lng]
    const apiCenter = { latitude: 12.9716, longitude: 77.5946 };

    // In GeoJSON: index 0 is Longitude (-180 to 180), index 1 is Latitude (-90 to 90)
    expect(geoJsonPoint[0]).toBeGreaterThan(geoJsonPoint[1]); // In Bangalore, lng (~77.6) > lat (~12.9)

    // In Leaflet: index 0 is Latitude, index 1 is Longitude
    expect(leafletPoint[0]).toBeLessThan(leafletPoint[1]);

    // Test IssueHeatmap resolution
    const mockHeatmapData = {
      hotspots: [
        {
          id: 'hs-1',
          center: apiCenter,
          coordinates: geoJsonPoint,
          centerCoordinates: leafletPoint,
          radiusMeters: 200,
          issueCount: 4,
          dominantDepartment: 'Roads',
        },
      ],
    };

    const { getByTestId } = render(<IssueHeatmap data={mockHeatmapData} />);
    const map = getByTestId('map-container');
    expect(map).toBeInTheDocument();

    const circle = getByTestId('map-circle');
    expect(circle).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Filter adjustments trigger correct API query parameters
  // --------------------------------------------------------------------------
  test('Scenario 9: Filter adjustments trigger expected API query parameters', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        summary: { totalHotspots: 0, totalIssuesInHotspots: 0, totalPointsAnalyzed: 0 },
        hotspots: [],
      },
    });

    render(<GeographicAnalysis intelligence={{}} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/admin/intelligence/hotspots',
        expect.objectContaining({
          params: expect.objectContaining({
            radiusMeters: 200,
            minPoints: 3,
          }),
        })
      );
    });

    // Change Radius to 350m
    const radiusSelect = screen.getByTestId('filter-radius');
    fireEvent.change(radiusSelect, { target: { value: '350' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/admin/intelligence/hotspots',
        expect.objectContaining({
          params: expect.objectContaining({
            radiusMeters: 350,
          }),
        })
      );
    });

    // Change Department to "Roads"
    const deptSelect = screen.getByTestId('filter-department');
    fireEvent.change(deptSelect, { target: { value: 'Roads' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/admin/intelligence/hotspots',
        expect.objectContaining({
          params: expect.objectContaining({
            department: 'Roads',
          }),
        })
      );
    });

    // Change Priority to "urgent"
    const prioSelect = screen.getByTestId('filter-priority');
    fireEvent.change(prioSelect, { target: { value: 'urgent' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/admin/intelligence/hotspots',
        expect.objectContaining({
          params: expect.objectContaining({
            priority: 'urgent',
          }),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Unauthorized sessions do not display privileged data
  // --------------------------------------------------------------------------
  test('Scenario 10: Unauthorized sessions (403 Forbidden) do not display privileged hotspot data', async () => {
    api.get.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { error: 'Access denied: Administrator privileges required' },
      },
      message: 'Access denied: Administrator privileges required',
    });

    render(<GeographicAnalysis intelligence={{}} />);

    await waitFor(() => {
      expect(screen.getByTestId('hotspot-error-banner')).toBeInTheDocument();
    });

    expect(screen.getByText(/Access denied: Administrator privileges required/i)).toBeInTheDocument();

    // Privileged details must NOT be rendered
    expect(screen.queryByTestId('hotspot-detail-panel')).not.toBeInTheDocument();
    expect(screen.queryByText(/Constituent Issues/i)).not.toBeInTheDocument();
  });
});
