import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/admin/analytics?timeframe=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setAnalytics(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Fetch analytics error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication failed. Please login again.');
      } else {
        setError('Failed to load analytics data');
      }
      setLoading(false);
    }
  };

  const visitsOverTimeData = {
    labels: analytics?.visitsOverTime?.map(d => d.date) || [],
    datasets: [
      {
        label: 'Daily Visits',
        data: analytics?.visitsOverTime?.map(d => d.count) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }
    ]
  };

  const visitsByLocationData = {
    labels: analytics?.visitsByLocation?.map(d => d.location) || [],
    datasets: [
      {
        label: 'Visits by Location',
        data: analytics?.visitsByLocation?.map(d => d.count) || [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)'
        ]
      }
    ]
  };

  const chwPerformanceData = {
    labels: analytics?.chwPerformance?.map(d => d.chwId) || [],
    datasets: [
      {
        label: 'Visits Completed',
        data: analytics?.chwPerformance?.map(d => d.visitsCount) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  const fraudDetectionData = {
    labels: ['Verified Visits', 'Flagged Visits', 'Pending Review'],
    datasets: [
      {
        data: [
          analytics?.fraudStats?.verified || 0,
          analytics?.fraudStats?.flagged || 0,
          analytics?.fraudStats?.pending || 0
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 205, 86, 0.6)'
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Analytics & Reports
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 3 Months</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </Select>
          </FormControl>

          <Button 
            variant="outlined" 
            onClick={fetchAnalytics}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {analytics?.summary?.totalVisits || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Visits
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {analytics?.summary?.activeChws || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active CHWs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {analytics?.summary?.totalPatients || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Patients
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {analytics?.summary?.fraudAlerts || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fraud Alerts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Visits Over Time */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Visits Over Time
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line data={visitsOverTimeData} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Fraud Detection Stats */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Visit Verification Status
              </Typography>
              <Box sx={{ height: 300 }}>
                <Pie data={fraudDetectionData} options={pieOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* CHW Performance */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CHW Performance
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar data={chwPerformanceData} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Visits by Location */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Visits by Location
              </Typography>
              <Box sx={{ height: 300 }}>
                <Pie data={visitsByLocationData} options={pieOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;
