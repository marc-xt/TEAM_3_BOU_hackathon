import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

/**
 * ComplaintClusterChart - grouped bar chart of complaint counts per lender,
 * split by complaint category (Interest Rate, Debt Collection, Data Privacy).
 *
 * Props:
 *   data - array of { lender, count, category }
 *   loading - boolean
 *   error - string | null
 */
function ComplaintClusterChart({ data = [], loading = false, error = null }) {
    if (loading) {
        return (
            <div className="chart-container" style={styles.container}>
                <div style={styles.loading}>Loading complaint data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chart-container" style={styles.container}>
                <div style={styles.error}>Unable to load complaint data.</div>
            </div>
        );
    }

    const categories = [...new Set(data.map((d) => d.category))];
    const lenders = [...new Set(data.map((d) => d.lender))];

    const chartData = lenders.map((lender) => {
        const row = { lender };
        categories.forEach((cat) => {
            const match = data.find((d) => d.lender === lender && d.category === cat);
            row[cat] = match ? match.count : 0;
        });
        return row;
    });

    const categoryColours = {
        'Interest Rate': 'var(--color-primary)',
        'Debt Collection': 'var(--color-accent)',
        'Data Privacy': 'var(--color-bou-maroon-dark)',
        // The live backend doesn't currently break complaints down by
        // category, so api/client.js tags every row 'Complaints'.
        'Complaints': 'var(--color-primary)',
    };

    return (
        <div className="chart-container" style={styles.container}>
            <h3 style={styles.title}>Complaint Clusters by Lender</h3>
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                    <XAxis dataKey="lender" tick={{ fontSize: 13 }} />
                    <YAxis tick={{ fontSize: 13 }} />
                    <Tooltip
                        contentStyle={{
                            borderRadius: 6,
                            border: '1px solid var(--color-gray-300)',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        }}
                    />
                    <Legend />
                    {categories.map((cat) => (
                        <Bar
                            key={cat}
                            dataKey={cat}
                            name={cat}
                            fill={categoryColours[cat] || 'var(--color-gray-600)'}
                            radius={[3, 3, 0, 0]}
                        />
                    ))}
                </BarChart>
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
};

export default ComplaintClusterChart;
