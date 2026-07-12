import React, { useState } from 'react';
import RoleToggle from './components/RoleToggle';
import BoUView from './views/BoUView';
import UMRAView from './views/UMRAView';
import './styles/theme.css';

/**
 * App — root component for the BorrowWise Regulator Dashboard.
 *
 * Manages the active regulator view (BoU/UMRA) and renders the
 * appropriate view component with the role toggle at the top.
 */
function App() {
    const [activeView, setActiveView] = useState('bou');

    return (
        <div style={styles.appRoot}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <h1 style={styles.title}>BorrowWise</h1>
                    <span style={styles.subtitle}>Regulator Dashboard</span>
                </div>
                <div style={styles.headerRight}>
                    <RoleToggle activeView={activeView} onToggle={setActiveView} />
                </div>
            </header>

            {/* Main content area */}
            <main style={styles.main}>
                {activeView === 'bou' ? <BoUView /> : <UMRAView />}
            </main>

            {/* Footer */}
            <footer style={styles.footer}>
                <span>Bank of Uganda Digital Lending Hackathon 2026</span>
                <span style={styles.footerDivider}>|</span>
                <span>BorrowWise — Dev 2 Dashboard</span>
            </footer>
        </div>
    );
}

const styles = {
    appRoot: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.75rem 1.5rem',
        backgroundColor: '#800020',
        color: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.75rem',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 700,
        color: '#ffffff',
        margin: 0,
        letterSpacing: '-0.02em',
    },
    subtitle: {
        fontSize: '0.875rem',
        color: '#e8c34a',
        fontWeight: 500,
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
    },
    main: {
        flex: 1,
        padding: '1.5rem',
        maxWidth: 1400,
        width: '100%',
        margin: '0 auto',
    },
    footer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #e9ecef',
        fontSize: '0.8125rem',
        color: '#6c757d',
    },
    footerDivider: {
        color: '#dee2e6',
    },
};

export default App;