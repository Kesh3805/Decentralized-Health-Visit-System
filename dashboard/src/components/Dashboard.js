import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert,
  LinearProgress,
  Chip 
} from '@mui/material';
import { 
  People as PeopleIcon, 
  List as ListIcon, 
  Assessment as AssessmentIcon, 
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalVisits: 0,
    verifiedVisits: 0,
    totalCHWs: 0,
    activeCHWs: 0,
    totalFeedbacks: 0,
    averageRating: 0,
    fraudAlerts: 0,
    verificationRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get authentication token
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        // Fetch dashboard statistics
        const response = await axios.get('http://localhost:3001/api/admin/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        setStats(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError('Authentication failed. Please login again.');
          // Clear invalid token
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        } else if (err.response?.status === 500) {
          setError('Server error. Please try again later.');
        } else if (err.code === 'ECONNREFUSED') {
          setError('Unable to connect to server. Please check if the backend is running.');
        } else {
          setError('Failed to load dashboard data');
        }
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
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
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      
      <Grid container spacing={3}>
        {/* Total Visits */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ListIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Typography variant="h6" component="div">
                  Total Visits
                </Typography>
              </Box>
              <Typography variant="h3" component="div" align="center" color="primary.main">
                {stats.totalVisits.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                All recorded visits
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Verified Visits */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Typography variant="h6" component="div">
                  Verified Visits
                </Typography>
              </Box>
              <Typography variant="h3" component="div" align="center" color="success.main">
                {stats.verifiedVisits.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                {stats.verificationRate}% verification rate
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={parseFloat(stats.verificationRate)} 
                sx={{ mt: 1 }}
                color="success"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Active CHWs */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Typography variant="h6" component="div">
                  Active CHWs
                </Typography>
              </Box>
              <Typography variant="h3" component="div" align="center" color="info.main">
                {stats.activeCHWs}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                of {stats.totalCHWs} total CHWs
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Fraud Alerts */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Typography variant="h6" component="div">
                  Fraud Alerts
                </Typography>
              </Box>
              <Typography variant="h3" component="div" align="center" color="warning.main">
                {stats.fraudAlerts}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                {stats.fraudAlerts > 0 ? 'Requires attention' : 'No active alerts'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Patient Feedback */}
        <Grid item xs={12} sm={6} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StarIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Typography variant="h6" component="div">
                  Patient Feedback
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h4" component="div" color="warning.main">
                    {stats.averageRating.toFixed(1)} ★
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average rating
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h5" component="div">
                    {stats.totalFeedbacks.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total feedbacks
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} sm={6} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Typography variant="h6" component="div">
                  System Status
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Backend API</Typography>
                  <Chip label="Online" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Database</Typography>
                  <Chip label="Connected" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Blockchain</Typography>
                  <Chip label="Disabled" color="warning" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1">Fraud Detection</Typography>
                  <Chip label="Active" color="success" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<PeopleIcon />} 
                  label="Manage CHWs" 
                  color="primary" 
                  variant="outlined"
                  clickable
                  onClick={() => window.location.href = '/chws'}
                />
                <Chip 
                  icon={<ListIcon />} 
                  label="View Visits" 
                  color="primary" 
                  variant="outlined"
                  clickable
                  onClick={() => window.location.href = '/visits'}
                />
                <Chip 
                  icon={<AssessmentIcon />} 
                  label="Analytics" 
                  color="primary" 
                  variant="outlined"
                  clickable
                  onClick={() => window.location.href = '/analytics'}
                />
                <Chip 
                  icon={<WarningIcon />} 
                  label="Fraud Detection" 
                  color="warning" 
                  variant="outlined"
                  clickable
                  onClick={() => window.location.href = '/fraud-detection'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
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
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      
      <Grid container spacing={3}>
        {/* Total Visits */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ListIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Typography variant="h5" component="div">
                  Total Visits
                </Typography>
              </Box>
              <Typography variant="h3" component="div" align="center">
                {stats.totalVisits}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                +12% from last month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Verified Visits */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Typography variant="h5" component="div">
                  Verified Visits
                </Typography>
              </Box>
              <Typography variant="h3" component="div" align="center">
                {stats.verifiedVisits}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                {(stats.verifiedVisits / stats.totalVisits * 100).toFixed(1)}% verification rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Total CHWs */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Typography variant="h5" component="div">
                  Active CHWs
                </Typography>
              </Box>
              <Typography variant="h3" component="div" align="center">
                {stats.totalCHWs}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                2 new this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Feedback Count */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Typography variant="h5" component="div">
                  Feedback Received
                </Typography>
              </Box>
              <Typography variant="h3" component="div" align="center">
                {stats.feedbackCount}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                {(stats.feedbackCount / stats.totalVisits * 100).toFixed(1)}% feedback rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Fraud Alerts */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Typography variant="h5" component="div">
                  Fraud Alerts
                </Typography>
              </Box>
              <Typography variant="h3" component="div" align="center">
                {stats.fraudAlerts}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Requires immediate attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Recent Activity */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Recent Activity
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="body1">
              • New CHW registration: Dr. Sarah Johnson (ID: CHW001)
            </Typography>
            <Typography variant="body1">
              • Visit verified: Patient #P12345 at 2023-08-15 14:30
            </Typography>
            <Typography variant="body1">
              • Feedback submitted: 5-star rating for Visit #V98765
            </Typography>
            <Typography variant="body1">
              • Fraud alert: Suspicious pattern detected for CHW #CHW007
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;
