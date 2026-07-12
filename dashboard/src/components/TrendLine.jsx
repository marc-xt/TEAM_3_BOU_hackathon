import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

/**
 * TrendLine — line chart showing trend of cases filed over time.
 * Aggregates case data by month.
 *
 * Props:
 *   data  — array of { created_at: string (ISO 8601), ...caseFields }
 *   loading — boolean
 *   error  — string | null
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function aggregateByMonth(cases) {
    const counts = {};
    cases.forEach((c) => {
        if (!c.created_at) return;
        const monthKey = c.created_at.substring(0, 7); // "YYYY-MM"
        counts[monthKey] = (counts[monthKey] || 0) + 1;
    });

    return Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => {
            const [year, monthNum] = key.split('-');
            return {
                month: `${MONTHS[parseInt(monthNum, 10) - 1]} ${year}`,
                count,
                _sortKey: key,
            };
        });
}

function TrendLine({ data = [], loading = false, error = null }) {
    if (loading) {
        return (
            <div className="chart-container" style={styles.container}>
                <div style={styles.loading}>Loading trend data…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chart-container" style={styles.container}>
                <div style={styles.error}>Unable to load trend data.</div>
            </div>
        );
    }

    const chartData = aggregateByMonth(data);

    if (chartData.length === 0) {
        return (
            <div className="chart-container" style={styles.container}>
                <h3 style={styles.title}>Complaint Trend</h3>
                <div style={styles.empty}>No case data available for trend.</div>
            </div>
        );
    }

    return (
        <div className="chart-container" style={styles.container}>
            <h3 style={styles.title}>Complaint Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{
                            borderRadius: 6,
                            border: '1px solid #dee2e6',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#800020"
                        strokeWidth={2}
                        dot={{ fill: '#800020', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
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
        padding: '2rem 0',
        textAlign: 'center',
        color: '#6c757d',
    },
    error: {
        padding: '2rem 0',
        textAlign: 'center',
        color: '#dc3545',
        fontWeight: 500,
    },
    empty: {
        padding: '2rem 0',
        textAlign: 'center',
        color: '#6c757d',
    },
};

export default TrendLine;