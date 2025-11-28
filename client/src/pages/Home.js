import React from "react";
import CategoryCard, { CATEGORIES } from "../components/CategoryCard";

function Home() {
  return (
    <div className="container">
      <h1>Welcome to the Civic Issues Reporting Portal</h1>
      <p>
        Quickly report civic problems and track their status. Select a category below to get started.
      </p>

      <div style={{ marginTop: '2rem' }}>
        <h3>Report an Issue by Category</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '1.5rem' }}>
          Click on any category to quickly report an issue. Your location and photos will be captured automatically.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem'
        }}>
          {CATEGORIES.map((category) => (
            <CategoryCard
              key={category}
              category={category}
            />
          ))}
        </div>
      </div>

      <div style={{
        marginTop: '3rem',
        padding: '1.5rem',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h4 style={{ marginBottom: '1rem', color: 'var(--theme-text-dark)' }}>
          📱 How to Report an Issue
        </h4>
        <ul style={{ marginLeft: '1.5rem', marginTop: '0.75rem', lineHeight: '1.8' }}>
          <li><strong>Select a category</strong> from the cards above</li>
          <li><strong>Take photos</strong> of the issue (multiple images supported)</li>
          <li><strong>Add your location</strong> using GPS or manual entry</li>
          <li><strong>Describe the problem</strong> in detail</li>
          <li><strong>Submit</strong> and track the status in "View Issues"</li>
        </ul>
      </div>

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'rgba(33, 150, 243, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(33, 150, 243, 0.3)'
      }}>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          <strong>💡 Tip:</strong> For faster reporting, allow location access in your browser settings.
          Backend: <code>http://localhost:5000</code> | Frontend: <code>http://localhost:3000</code>
        </p>
      </div>
    </div>
  );
}

export default Home;
