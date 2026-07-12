import React from 'react';

/**
 * CaseList - tabular display of regulator cases with status badges.
 *
 * Props:
 *   cases - array of { id, regulator, status, case_type, lender_name,
 *           borrower_district, notes?, created_at }
 *           (shape matches core.serializers.CaseSerializer; `notes` is
 *           omitted by the backend for the UMRA view)
 *   loading - boolean
 *   error - string | null
 *   view - 'bou' | 'umra' (controls whether the Notes column renders)
 */

const STATUS_LABELS = {
    open: 'Open',
    under_review: 'Under Review',
    resolved: 'Resolved',
};

const STATUS_COLORS = {
    open: { bg: '#fff3cd', color: '#856404' },
    under_review: { bg: '#cce5ff', color: '#004085' },
    resolved: { bg: '#d4edda', color: '#155724' },
};

// Mirrors core/constants.py CASE_TYPE_CHOICES so labels stay in sync
// with what the backend actually routes on.
const CASE_TYPE_LABELS = {
    interest_rate: 'Excessive Interest Rate',
    hidden_fees: 'Hidden Fees',
    harassment_sms: 'Harassment via SMS/Calls',
    data_privacy: 'Data Privacy Violation',
    unlicensed_lender: 'Unlicensed Lender',
    fraud: 'Fraud / Impersonation',
};

function StatusBadge({ status }) {
    const baseStyle = {
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: '0.75rem',
        fontWeight: 500,
    };

    const { bg, color } = STATUS_COLORS[status] || { bg: '#e9ecef', color: 'var(--color-gray-700)' };

    return (
        <span style={{ ...baseStyle, backgroundColor: bg, color }}>
            {STATUS_LABELS[status] || status}
        </span>
    );
}

function formatDate(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-UG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CaseList({ cases = [], loading = false, error = null, view = 'bou' }) {
    if (loading) {
        return (
            <div className="chart-container" style={styles.container}>
                <div style={styles.loading}>Loading cases...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chart-container" style={styles.container}>
                <div style={styles.error}>Unable to load case data.</div>
            </div>
        );
    }

    if (cases.length === 0) {
        return (
            <div className="chart-container" style={styles.container}>
                <h3 style={styles.title}>Case List</h3>
                <div style={styles.empty}>No cases to display.</div>
            </div>
        );
    }

    const showNotes = view === 'bou';

    return (
        <div className="chart-container" style={styles.container}>
            <h3 style={styles.title}>Case List</h3>
            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Lender</th>
                            <th style={styles.th}>District</th>
                            <th style={styles.th}>Case Type</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Date Filed</th>
                            {showNotes && <th style={styles.th}>Notes</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {cases.map((c) => (
                            <tr key={c.id} style={styles.tr}>
                                <td style={styles.td}>{c.id}</td>
                                <td style={styles.td}>{c.lender_name}</td>
                                <td style={styles.td}>{c.borrower_district}</td>
                                <td style={styles.td}>
                                    {CASE_TYPE_LABELS[c.case_type] || c.case_type}
                                </td>
                                <td style={styles.td}>
                                    <StatusBadge status={c.status} />
                                </td>
                                <td style={styles.td}>{formatDate(c.created_at)}</td>
                                {showNotes && <td style={styles.td}>{c.notes || '-'}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const styles = {
    container: {
        background: 'var(--color-surface)',
        borderRadius: 8,
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    title: {
        marginBottom: '0.75rem',
        fontSize: '1rem',
        fontWeight: 600,
        color: 'var(--color-text)',
    },
    tableWrapper: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.8125rem',
    },
    th: {
        textAlign: 'left',
        padding: '0.5rem 0.625rem',
        fontWeight: 600,
        color: 'var(--color-gray-700)',
        borderBottom: '2px solid var(--color-gray-200)',
        whiteSpace: 'nowrap',
    },
    tr: {
        borderBottom: '1px solid var(--color-gray-100)',
    },
    td: {
        padding: '0.5rem 0.625rem',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
    },
    loading: {
        padding: '3rem 0',
        textAlign: 'center',
        color: 'var(--color-gray-600)',
    },
    error: {
        padding: '3rem 0',
        textAlign: 'center',
        color: 'var(--color-danger)',
        fontWeight: 500,
    },
    empty: {
        padding: '2rem 0',
        textAlign: 'center',
        color: 'var(--color-gray-600)',
    },
};

export default CaseList;
