import React from 'react';

const ROLES = [
    { id: 'bou', label: 'BoU', fullLabel: 'Bank of Uganda' },
    { id: 'umra', label: 'UMRA', fullLabel: 'Uganda Microfinance Regulatory Authority' },
];

function RoleToggle({ activeView = 'bou', onToggle }) {
    return (
        <div style={styles.wrapper} aria-label="Regulator view selector">
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
    );
}

const styles = {
    wrapper: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--color-gray-200)',
        backgroundColor: 'var(--color-gray-100)',
    },
    button: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: 104,
        padding: '0.45rem 0.9rem',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontSize: '0.8125rem',
        lineHeight: 1.25,
    },
    buttonActive: {
        backgroundColor: 'var(--color-primary)',
        color: '#ffffff',
        boxShadow: 'var(--shadow-sm)',
    },
    buttonInactive: {
        backgroundColor: 'transparent',
        color: 'var(--color-gray-700)',
    },
    buttonLabel: {
        fontWeight: 700,
        fontSize: '0.875rem',
    },
    buttonFullLabel: {
        fontSize: '0.65rem',
        opacity: 0.85,
        whiteSpace: 'nowrap',
    },
};

export default RoleToggle;