import React, { useState } from 'react';
import RoleToggle from './components/RoleToggle';
import BoUView from './views/BoUView';
import UMRAView from './views/UMRAView';
import './styles/theme.css';

function BrandMark() {
    return (
        <svg className="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M24 3 L42 10 V22 C42 33.5 34.8 41.6 24 45 C13.2 41.6 6 33.5 6 22 V10 Z" fill="#3D1F1A" stroke="#D4AF37" strokeWidth="1.5" />
            <path d="M24 8 L37 13 V22 C37 31 31.5 37.3 24 40 C16.5 37.3 11 31 11 22 V13 Z" fill="none" stroke="#8B5E3C" strokeWidth="1" />
            <path d="M14 26 A10 10 0 0 1 34 26" stroke="#D4AF37" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <circle cx="24" cy="26" r="2.6" fill="#F5A623" />
            <line x1="24" y1="26" x2="30" y2="20.5" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" />
            <text x="24" y="35" fontFamily="Fraunces, Georgia, serif" fontSize="9" fontWeight="600" fill="#E8C766" textAnchor="middle">CS</text>
        </svg>
    );
}

const navItems = ['Overview', 'Borrower Stress', 'Lender Registry', 'SMS Signals', 'Reports'];

function NavIcon({ index }) {
    const common = { stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' };
    const icons = [
        <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
        <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
        <path d="M12 2 L21 6 V12 C21 18 17 21.5 12 23 C7 21.5 3 18 3 12 V6 Z" />,
        <><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
        <><path d="M9 3H4v18h16V10h-5V3z" /><path d="M15 3l5 7h-5V3z" /></>,
    ];

    return <svg viewBox="0 0 24 24" {...common}>{icons[index]}</svg>;
}

function App() {
    const [activeView, setActiveView] = useState('bou');
    const activeLabel = activeView === 'bou' ? 'Bank of Uganda' : 'UMRA';

    return (
        <div className="dashboard-shell">
            <aside className="sidebar">
                <div className="brand">
                    <BrandMark />
                    <div>
                        <div className="brand-name">CreditShield</div>
                        <div className="brand-sub">Lending Oversight</div>
                    </div>
                </div>

                <nav className="nav" aria-label="Dashboard sections">
                    {navItems.map((item, index) => (
                        <a key={item} className={`nav-item ${index === 0 ? 'active' : ''}`} href="#overview">
                            <NavIcon index={index} />
                            {item}
                        </a>
                    ))}
                </nav>

                <div className="sidebar-foot">
                    BoU@60 Hackathon build<br />
                    Regulator-facing prototype
                </div>
            </aside>

            <div className="dashboard-workspace">
                <header className="topbar">
                    <div>
                        <div className="topbar-eyebrow">Regulatory Dashboard</div>
                        <h1>Digital Lending Oversight</h1>
                    </div>
                    <div className="topbar-actions">
                        <div className="live-pill"><span className="dot" />Live API</div>
                        <RoleToggle activeView={activeView} onToggle={setActiveView} />
                    </div>
                </header>

                <main id="overview" className="content">
                    <section className="page-intro">
                        <div>
                            <div className="section-kicker">{activeLabel} view</div>
                            <h2>Complaint intelligence and borrower exposure</h2>
                        </div>
                        <div className="intro-stat">
                            <span>Regulator Mode</span>
                            <strong>{activeView.toUpperCase()}</strong>
                        </div>
                    </section>

                    {activeView === 'bou' ? <BoUView /> : <UMRAView />}
                </main>
            </div>
        </div>
    );
}

export default App;