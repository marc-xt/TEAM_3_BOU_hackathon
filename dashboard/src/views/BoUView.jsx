import React, { useState, useEffect, useCallback } from 'react';
import ComplaintClusterChart from '../components/ComplaintClusterChart';
import ExposureHeatmap from '../components/ExposureHeatmap';
import TrendLine from '../components/TrendLine';
import CaseList from '../components/CaseList';
import { fetchComplaints, fetchComplaintTrend, fetchExposure, fetchCases } from '../api/client';

/**
 * BoUView — Bank of Uganda regulator dashboard.
 * Shows complaint clusters, exposure heatmap, trend line, and full case list
 * with BoU-specific fields (assigned officer, review notes).
 */
function BoUView() {
    const [complaints, setComplaints] = useState([]);
    const [exposure, setExposure] = useState([]);
    const [trend, setTrend] = useState([]);
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState({
        complaints: true,
        exposure: true,
        trend: true,
        cases: true,
    });
    const [errors, setErrors] = useState({
        complaints: null,
        exposure: null,
        trend: null,
        cases: null,
    });

    const loadData = useCallback(async () => {
        try {
            const complaintsData = await fetchComplaints();
            setComplaints(complaintsData);
            setErrors((prev) => ({ ...prev, complaints: null }));
        } catch (err) {
            setErrors((prev) => ({ ...prev, complaints: err.message }));
        } finally {
            setLoading((prev) => ({ ...prev, complaints: false }));
        }

        try {
            const exposureData = await fetchExposure();
            setExposure(exposureData);
            setErrors((prev) => ({ ...prev, exposure: null }));
        } catch (err) {
            setErrors((prev) => ({ ...prev, exposure: err.message }));
        } finally {
            setLoading((prev) => ({ ...prev, exposure: false }));
        }

        try {
            const trendData = await fetchComplaintTrend();
            setTrend(trendData);
            setErrors((prev) => ({ ...prev, trend: null }));
        } catch (err) {
            setErrors((prev) => ({ ...prev, trend: err.message }));
        } finally {
            setLoading((prev) => ({ ...prev, trend: false }));
        }

        try {
            const casesData = await fetchCases('bou');
            setCases(casesData);
            setErrors((prev) => ({ ...prev, cases: null }));
        } catch (err) {
            setErrors((prev) => ({ ...prev, cases: err.message }));
        } finally {
            setLoading((prev) => ({ ...prev, cases: false }));
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div style={styles.grid}>
            <div style={styles.chartRow}>
                <div style={styles.half}>
                    <ComplaintClusterChart
                        data={complaints}
                        loading={loading.complaints}
                        error={errors.complaints}
                    />
                </div>
                <div style={styles.half}>
                    <ExposureHeatmap
                        data={exposure}
                        loading={loading.exposure}
                        error={errors.exposure}
                    />
                </div>
            </div>
            <div style={styles.chartRow}>
                <div style={styles.third}>
                    <TrendLine data={trend} loading={loading.trend} error={errors.trend} />
                </div>
                <div style={styles.twoThirds}>
                    <CaseList
                        cases={cases}
                        loading={loading.cases}
                        error={errors.cases}
                        view="bou"
                    />
                </div>
            </div>
        </div>
    );
}

const styles = {
    grid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    chartRow: {
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    half: {
        flex: '1 1 calc(50% - 0.5rem)',
        minWidth: 320,
    },
    third: {
        flex: '1 1 calc(33.33% - 0.667rem)',
        minWidth: 280,
    },
    twoThirds: {
        flex: '1 1 calc(66.67% - 0.333rem)',
        minWidth: 400,
    },
};

export default BoUView;