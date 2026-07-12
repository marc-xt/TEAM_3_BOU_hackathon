import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

/**
 * ExposureHeatmap — horizontal bar chart showing borrower exposure
 * distribution by district. Uses colour intensity to indicate
 * relative exposure volume (acts as a heatmap).
 *
 * Props:
 *   data  — array of { district, total_borrowers, total_exposure, avg_loan }
 *   loading — boolean
 *   error  — string | null
 */

// Maroon colour scale: lighter → darker based on exposure magnitude
const COLOUR_SCALE = [
    '#f5e0e6',
    '#e8b8c4',
    '#d98fa3',
    '#c66682',
    '#b33d61',
    '#9e1b3c',
    '#800020',
];

function getColour(value, maxValue) {
    if (maxValue === 0) return COLOUR_SCALE[0];
    const ratio = value / maxValue;
    const index = Math.min(Math.floor(ratio * COLOUR_SCALE.length), COLOUR_SCALE.length - 1);
    return COLOUR_SCALE[index];
}

function formatUGX(amount) {
    if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(0)}M`;
    if (amount >= 1e3) return `${(amount / 1e3).toFixed(0)}K`;
    return String(amount);
}

function ExposureHeatmap({ data = [], loading = false, error = null }) {
    if (loading) {
        return (
            <div className="chart-container" style={styles.container}>
                <div style={styles.loading}>Loading exposure data…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chart-container" style={styles.container}>
                <div style={styles.error}>Unable to load exposure data.</div>
            </div>
        );
    }

    const maxExposure = Math.max(...data.map((d) => d.total_exposure), 1);
    // Sort descending by exposure for visual clarity
    const sorted = [...data].sort((a, b) => b.total_exposure - a.total_exposure);

    return (
        <div className="chart-container" style={styles.container}>
            <h3 style={styles.title}>Borrower Exposure by District</h3>
            <ResponsiveContainer width="100%" height={Math.max(240, sorted.length * 28)}>
                <BarChart
                    data={sorted}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 80, bottom: 4 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" horizontal={false} />
                    <XAxis
                        type="number"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => formatUGX(v)}
                    />
                    <YAxis
                        type="category"
                        dataKey="district"
                        tick={{ fontSize: 12 }}
                        width={76}
                    />
                    <Tooltip
                        formatter={(value, name) => {
                            if (name === 'total_exposure') return [formatUGX(value) + ' UGX', 'Total Exposure'];
                            if (name === 'total_borrowers') return [value.toLocaleString(), 'Borrowers'];
                            if (name === 'avg_loan') return [formatUGX(value) + ' UGX', 'Avg Loan'];
                            return [value, name];
                        }}
                        labelFormatter={(label) => `District: ${label}`}
                        contentStyle={{
                            borderRadius: 6,
                            border: '1px solid #dee2e6',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            fontSize: 13,
                        }}
                    />
                    <Bar dataKey="total_exposure" radius={[0, 3, 3, 0]}>
                        {sorted.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getColour(entry.total_exposure, maxExposure)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div style={styles.legend}>
                <span style={styles.legendLabel}>Lower</span>
                {COLOUR_SCALE.map((c, i) => (
                    <span
                        key={i}
                        style={{ ...styles.legendSwatch, backgroundColor: c }}
                    />
                ))}
                <span style={styles.legendLabel}>Higher</span>
            </div>
        </div>
    );
}

const styles = {
    container: {
        background: '#ffffff',
        borderRadius: 8,
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    title: {
        marginBottom: '0.75rem',
        fontSize: '1rem',
        fontWeight: 600,
        color: '#212529',
    },
    loading: {
        padding: '3rem 0',
        textAlign: 'center',
        color: '#6c757d',
    },
    error: {
        padding: '3rem 0',
        textAlign: 'center',
        color: '#dc3545',
        fontWeight: 500,
    },
    legend: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: '0.75rem',
    },
    legendSwatch: {
        display: 'inline-block',
        width: 20,
        height: 12,
        borderRadius: 2,
    },
    legendLabel: {
        fontSize: '0.75rem',
        color: '#6c757d',
        margin: '0 4px',
    },
};

export default ExposureHeatmap;