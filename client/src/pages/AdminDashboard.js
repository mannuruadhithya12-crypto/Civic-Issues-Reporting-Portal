import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useRealTime } from '../context/RealTimeContext';
import { useDataMode } from '../context/DataModeContext';
import api from '../services/api';
import Spinner from '../components/common/Spinner';

// Centers
import CommandCenter from '../components/admin/CommandCenter';
import IntelligenceCenter from '../components/admin/IntelligenceCenter';
import WorkerManagement from '../components/admin/WorkerManagement';
import LiveOperationsCenter from '../components/admin/LiveOperationsCenter';
import LiveMapCenter from '../components/admin/LiveMapCenter';
import CivicIssuesCenter from '../components/admin/CivicIssuesCenter';
import ReportsCenter from '../components/admin/ReportsCenter';
import AdminNotificationsCenter from '../components/admin/AdminNotificationsCenter';
import SettingsAuditCenter from '../components/admin/SettingsAuditCenter';
import AdminCitizensCenter from '../components/admin/AdminCitizensCenter';
import SubmitIssue from './SubmitIssue';

const AdminDashboard = ({ initialCenter = 'command' }) => {
    const { user } = useContext(AuthContext);
    const { subscribe } = useRealTime();
    const { dataMode } = useDataMode();
    
    // Shared State
    const [issues, setIssues] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [intelligence, setIntelligence] = useState({
        overview: null,
        geographic: null,
        trends: null,
        departments: null,
        categories: null,
        recurring: null,
        sla: null,
        anomalies: null,
        reports: null
    });
    const [loading, setLoading] = useState(true);

    // Command Center State
    const [newWorker, setNewWorker] = useState({ name: '', email: '', password: '', department: '' });
    const [showWorkerForm, setShowWorkerForm] = useState(false);
    const [viewProof, setViewProof] = useState(null);
    const [filters, setFilters] = useState({ status: '', department: '', search: '' });

    // Time filter for Civic Intelligence
    const [analyticsDays, setAnalyticsDays] = useState(30);

    const fetchData = useCallback(async (background = false) => {
        if (!background) setLoading(true);
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - analyticsDays);
            const dateParams = `?startDate=${startDate.toISOString()}`;

            const [
                issuesRes,
                overviewRes,
                geoRes,
                trendsRes,
                deptRes,
                catRes,
                recurRes,
                slaRes,
                anomaliesRes,
                reportsRes
            ] = await Promise.all([
                api.get('/issues'),
                api.get(`/analytics/overview${dateParams}`),
                api.get(`/analytics/geographic${dateParams}`),
                api.get(`/analytics/trends${dateParams}`),
                api.get(`/analytics/departments${dateParams}`),
                api.get(`/analytics/categories${dateParams}`),
                api.get(`/analytics/recurring${dateParams}`),
                api.get(`/analytics/sla${dateParams}`),
                api.get(`/analytics/anomalies${dateParams}`),
                api.get(`/analytics/reports`)
            ]);
            
            setIssues(issuesRes.data);
            setIntelligence({
                overview: overviewRes.data,
                geographic: geoRes.data,
                trends: trendsRes.data,
                departments: deptRes.data,
                categories: catRes.data,
                recurring: recurRes.data,
                sla: slaRes.data,
                anomalies: anomaliesRes.data,
                reports: reportsRes.data
            });
        } catch (err) {
            console.error("Error fetching admin data:", err);
            if (!background) alert("Failed to load dashboard data");
        } finally {
            if (!background) setLoading(false);
        }
    }, [analyticsDays]);

    const fetchWorkers = useCallback(async () => {
        try {
            const res = await api.get('/admin/workers');
            setWorkers(res.data);
        } catch (err) {
            console.error("Failed to fetch workers");
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchWorkers();

        // Subscribe to real-time domain events
        const unsubscribe = subscribe('*', () => {
            fetchData(true);
            fetchWorkers();
        });

        // Listen for mode changes
        const handleModeChange = () => {
            fetchData();
            fetchWorkers();
        };
        window.addEventListener('dataModeChanged', handleModeChange);

        return () => {
            unsubscribe();
            window.removeEventListener('dataModeChanged', handleModeChange);
        };
    }, [analyticsDays, dataMode, fetchData, fetchWorkers, subscribe]);

    const handleCreateWorker = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/create-worker', newWorker);
            alert("Worker created successfully!");
            setNewWorker({ name: '', email: '', password: '', department: '' });
            setShowWorkerForm(false);
            fetchWorkers();
        } catch (err) {
            console.error(err);
            alert("Failed to create worker");
        }
    };

    const handleAssign = async (issueId, workerId) => {
        try {
            await api.patch(`/issues/${issueId}/assign`, { assignedTo: workerId });
            fetchData(true);
        } catch (err) {
            console.error(err);
            alert("Failed to assign issue");
        }
    };

    const handleStatusChange = async (issueId, newStatus) => {
        try {
            await api.patch(`/issues/${issueId}/status`, { status: newStatus });
            fetchData(true);
        } catch (err) {
            console.error(err);
            alert("Failed to update status");
        }
    };

    const getStatusVariant = (status) => {
        switch (status) {
            case 'reported': return 'secondary';
            case 'assigned': return 'primary';
            case 'in_progress': return 'warning';
            case 'resolved': return 'success';
            case 'closed': return 'secondary';
            case 'reopened': return 'danger';
            default: return 'primary';
        }
    };

    const getPriorityVariant = (priority) => {
        switch (priority) {
            case 'low': return 'success';
            case 'medium': return 'warning';
            case 'high': return 'primary';
            case 'urgent': return 'danger';
            default: return 'secondary';
        }
    };

    if (loading && initialCenter !== 'liveMap' && initialCenter !== 'live' && initialCenter !== 'notifications' && initialCenter !== 'citizens') return (
        <div className="flex justify-center items-center min-h-screen bg-background">
            <Spinner size="lg" />
        </div>
    );

    // Map centers
    const centers = {
        command: <CommandCenter 
            issues={issues}
            workers={workers}
            handleAssign={handleAssign}
            handleStatusChange={handleStatusChange}
            filters={filters}
            setFilters={setFilters}
            viewProof={viewProof}
            setViewProof={setViewProof}
            getStatusVariant={getStatusVariant}
            getPriorityVariant={getPriorityVariant}
            onRefresh={() => { fetchData(true); fetchWorkers(); }}
        />,
        civic: <CivicIssuesCenter 
            workers={workers}
            onIssueUpdated={() => { fetchData(true); fetchWorkers(); }}
        />,
        citizens: <AdminCitizensCenter />,
        report: <div className="p-4 bg-white rounded-lg shadow-sm"><SubmitIssue /></div>,
        workers: <WorkerManagement 
            workers={workers}
            newWorker={newWorker}
            setNewWorker={setNewWorker}
            showWorkerForm={showWorkerForm}
            setShowWorkerForm={setShowWorkerForm}
            handleCreateWorker={handleCreateWorker}
            issues={issues}
            handleAssign={handleAssign}
            fetchWorkers={fetchWorkers}
        />,
        intelligence: <IntelligenceCenter 
            intelligence={intelligence}
            analyticsDays={analyticsDays}
            setAnalyticsDays={setAnalyticsDays}
            issues={issues}
        />,

        liveMap: <LiveMapCenter onRefreshParent={() => fetchData(true)} />,
        live: <LiveOperationsCenter />,
        reports: <ReportsCenter />,
        notifications: <AdminNotificationsCenter />,
        settings: <SettingsAuditCenter initialTab="settings" />,
        audit: <SettingsAuditCenter initialTab="audit" />
    };

    return (
        <div className="bg-background font-sans h-full w-full">
            {/* Main Content Area */}
            <div className="animate-fade-in w-full h-full max-w-[1600px] mx-auto">
                {centers[initialCenter]}
            </div>
        </div>
    );
};

export default AdminDashboard;
