import React, { useContext } from "react";
import IssueWizard from "../components/IssueWizard/IssueWizard";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { AuthContext } from "../context/AuthContext";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("IssueWizard crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center text-red-600">
          <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong.</h2>
          <p className="mb-6">The reporting wizard encountered an unexpected error.</p>
          <Button onClick={() => window.location.reload()} variant="primary">
            Reload Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function SubmitIssue() {
  const { user } = useContext(AuthContext);

  if (user && user.role === 'admin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Manual Issue Intake</h1>
          <p style={{ color: 'var(--admin-text-muted)', margin: 0, fontSize: '14px' }}>Log an issue reported via phone, email, or walk-in.</p>
        </div>
        
        <div className="admin-card">
          <ErrorBoundary>
            <IssueWizard isAdmin={true} />
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Report a Civic Issue</h2>
      <ErrorBoundary>
        <IssueWizard />
      </ErrorBoundary>
    </div>
  );
}

export default SubmitIssue;
