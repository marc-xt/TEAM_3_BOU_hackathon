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
 * TrendLine - line chart showing complaint volume over time.
 * Accepts backend-aggregated rows or raw records with created_at.
 *
 * Props:
 *   data - array of { month, count } or raw records with created_at
 *   loading - boolean
 *   error - string | null
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatPeriodLabel(periodValue) {
    if (!periodValue) return '';
    const [year, monthNum, day] = periodValue.split('-');
    const monthName = MONTHS[parseInt(monthNum, 10) - 1];
    if (!monthName) return periodValue;
    return day ? `${monthName} ${parseInt(day, 10)}` : `${monthName} ${year}`;
}

function buildTrendSeries(rows) {
    const backendRows = rows.filter((row) => row.month && row.count !== undefined);
    if (backendRows.length > 0) {
        return backendRows
            .map((row) => ({
                month: formatPeriodLabel(row.month),
                count: Number(row.count) || 0,
                _sortKey: row.month.substring(0, 10),
            }))
            .sort((a, b) => a._sortKey.localeCompare(b._sortKey));
    }

    const counts = {};
    rows.forEach((row) => {
        if (!row.created_at) return;
        const dateKey = row.created_at.substring(0, 10); // "YYYY-MM-DD"
        counts[dateKey] = (counts[dateKey] || 0) + 1;
    });

    return Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => ({
            month: formatPeriodLabel(key),
            count,
            _sortKey: key,
        }));
}

function TrendLine({ data = [], loading = false, error = null }) {
    if (loading) {
        return (
            <div className="chart-container" style={styles.container}>
                <div style={styles.loading}>Loading trend data...</div>
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

    const chartData = buildTrendSeries(data);

    if (chartData.length === 0) {
        return (
            <div className="chart-container" style={styles.container}>
                <h3 style={styles.title}>Complaint Trend</h3>
                <div style={styles.empty}>No complaint trend data available.</div>
            </div>
        );
    }

    return (
        <div className="chart-container" style={styles.container}>
            <h3 style={styles.title}>Complaint Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{
                            borderRadius: 6,
                            border: '1px solid var(--color-gray-300)',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="count"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--color-primary)', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
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
    loading: {
        padding: '2rem 0',
        textAlign: 'center',
        color: 'var(--color-gray-600)',
    },
    error: {
        padding: '2rem 0',
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

export default TrendLine;
