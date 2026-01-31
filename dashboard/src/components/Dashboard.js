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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { 
  People as PeopleIcon, 
  List as ListIcon, 
  Assessment as AssessmentIcon, 
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get authentication token
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      // Fetch dashboard statistics
      const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setStats(response.data);
      
      // Fetch recent visits for activity
      try {
        const visitsResponse = await axios.get(`${API_BASE_URL}/api/admin/visits?limit=5`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setRecentActivity(visitsResponse.data.visits || []);
      } catch (visitsErr) {
        console.warn('Could not fetch recent visits:', visitsErr);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication failed. Please login again.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Unable to connect to server. Please check if the backend is running.');
      } else {
        setError('Failed to load dashboard data');
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Chip 
              icon={<RefreshIcon />} 
              label="Retry" 
              onClick={fetchDashboardData} 
              clickable 
            />
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, mt: 8, ml: { sm: 30 } }}>
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
                value={parseFloat(stats.verificationRate) || 0} 
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
                <WarningIcon sx={{ fontSize: 40, color: stats.fraudAlerts > 0 ? 'error.main' : 'success.main', mr: 2 }} />
                <Typography variant="h6" component="div">
                  Fraud Alerts
                </Typography>
              </Box>
              <Typography variant="h3" component="div" align="center" color={stats.fraudAlerts > 0 ? 'error.main' : 'success.main'}>
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
                    {(stats.averageRating || 0).toFixed(1)} ★
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
                <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
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
                  onClick={() => navigate('/chws')}
                />
                <Chip 
                  icon={<ListIcon />} 
                  label="View Visits" 
                  color="primary" 
                  variant="outlined"
                  clickable
                  onClick={() => navigate('/visits')}
                />
                <Chip 
                  icon={<AssessmentIcon />} 
                  label="Analytics" 
                  color="primary" 
                  variant="outlined"
                  clickable
                  onClick={() => navigate('/analytics')}
                />
                <Chip 
                  icon={<WarningIcon />} 
                  label="Fraud Detection" 
                  color="warning" 
                  variant="outlined"
                  clickable
                  onClick={() => navigate('/fraud')}
                />
                <Chip 
                  icon={<RefreshIcon />} 
                  label="Refresh Data" 
                  color="default" 
                  variant="outlined"
                  clickable
                  onClick={fetchDashboardData}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Recent Visits
              </Typography>
              {recentActivity.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Visit ID</TableCell>
                        <TableCell>CHW ID</TableCell>
                        <TableCell>Patient ID</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentActivity.map((visit) => (
                        <TableRow key={visit.visitId}>
                          <TableCell>{visit.visitId?.substring(0, 20)}...</TableCell>
                          <TableCell>{visit.chwId}</TableCell>
                          <TableCell>{visit.patientId?.substring(0, 15)}...</TableCell>
                          <TableCell>{new Date(visit.timestamp).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip 
                              label={visit.isVerified ? 'Verified' : 'Pending'} 
                              color={visit.isVerified ? 'success' : 'warning'} 
                              size="small" 
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recent visits to display. Visits will appear here once CHWs start logging them.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
