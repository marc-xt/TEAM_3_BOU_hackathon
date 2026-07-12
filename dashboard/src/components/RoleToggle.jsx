import React from 'react';

/**
 * RoleToggle — switch between BoU (Bank of Uganda) and UMRA
 * (Uganda Microfinance Regulatory Authority) regulator views.
 *
 * Props:
 *   activeView — 'bou' | 'umra'
 *   onToggle   — (view: 'bou' | 'umra') => void
 */

const ROLES = [
    { id: 'bou', label: 'BoU', fullLabel: 'Bank of Uganda' },
    { id: 'umra', label: 'UMRA', fullLabel: 'Uganda Microfinance Regulatory Authority' },
];

function RoleToggle({ activeView = 'bou', onToggle }) {
    return (
        <div style={styles.wrapper}>
            <div style={styles.label}>Regulator View:</div>
            <div style={styles.toggleGroup}>
                {ROLES.map((role) => {
                    const isActive = activeView === role.id;
                    return (
                        <button
                            key={role.id}
                            onClick={() => onToggle(role.id)}
                            style={{
                                ...styles.button,
                                ...(isActive ? styles.buttonActive : styles.buttonInactive),
                            }}
                            aria-pressed={isActive}
                            aria-label={`Switch to ${role.fullLabel} view`}
                        >
                            <span style={styles.buttonLabel}>{role.label}</span>
                            <span style={styles.buttonFullLabel}>{role.fullLabel}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const styles = {
    wrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem 0',
    },
    label: {
        fontSize: '0.875rem',
        fontWeight: 500,
        color: '#495057',
        whiteSpace: 'nowrap',
    },
    toggleGroup: {
        display: 'flex',
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid #dee2e6',
    },
    button: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0.5rem 1.25rem',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontSize: '0.8125rem',
        lineHeight: 1.3,
    },
    buttonActive: {
        backgroundColor: '#800020',
        color: '#ffffff',
    },
    buttonInactive: {
        backgroundColor: '#ffffff',
        color: '#495057',
    },
    buttonLabel: {
        fontWeight: 600,
        fontSize: '0.875rem',
    },
    buttonFullLabel: {
        fontSize: '0.6875rem',
        opacity: 0.85,
    },
};

export default RoleToggle;