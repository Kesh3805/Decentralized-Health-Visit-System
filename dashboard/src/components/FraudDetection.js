import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Security as SecurityIcon,
  LocationOn as LocationOnIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import axios from 'axios';

const FraudDetection = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchFraudAlerts();
  }, []);

  const fetchFraudAlerts = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await axios.get('http://localhost:3001/api/admin/fraud-alerts', {
        headers: {
          'Authorization': Bearer 
        }
      });

      setAlerts(response.data.alerts);
      setLoading(false);
    } catch (err) {
      console.error('Fetch fraud alerts error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication failed. Please login again.');
      } else {
        setError('Failed to load fraud alerts');
      }
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId, resolution) => {
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.post(http://localhost:3001/api/admin/fraud-alerts//resolve, {
        resolution,
        resolvedBy: 'admin'
      }, {
        headers: {
          'Authorization': Bearer 
        }
      });

      fetchFraudAlerts();
      setDialogOpen(false);
    } catch (err) {
      console.error('Resolve alert error:', err);
      setError('Failed to resolve alert');
    }
  };

  const getSeverityChip = (score) => {
    if (score >= 80) {
      return <Chip label="Critical" color="error" size="small" icon={<ErrorIcon />} />;
    } else if (score >= 60) {
      return <Chip label="High" color="warning" size="small" icon={<WarningIcon />} />;
    } else if (score >= 30) {
      return <Chip label="Medium" color="info" size="small" />;
    }
    return <Chip label="Low" color="success" size="small" />;
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      'pending': { label: 'Pending', color: 'warning' },
      'investigating': { label: 'Investigating', color: 'info' },
      'resolved': { label: 'Resolved', color: 'success' },
      'false_positive': { label: 'False Positive', color: 'default' }
    };
    
    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getRuleIcon = (ruleType) => {
    const icons = {
      'location_anomaly': <LocationOnIcon />,
      'time_pattern': <ScheduleIcon />,
      'duplicate_visit': <PersonIcon />,
      'suspicious_activity': <SecurityIcon />
    };
    return icons[ruleType] || <WarningIcon />;
  };

  const filteredAlerts = alerts.filter(alert => {
    const severityMatch = filterSeverity === 'all' || 
      (filterSeverity === 'critical' && alert.fraudScore >= 80) ||
      (filterSeverity === 'high' && alert.fraudScore >= 60 && alert.fraudScore < 80) ||
      (filterSeverity === 'medium' && alert.fraudScore >= 30 && alert.fraudScore < 60) ||
      (filterSeverity === 'low' && alert.fraudScore < 30);
    
    const statusMatch = filterStatus === 'all' || alert.status === filterStatus;
    
    return severityMatch && statusMatch;
  });

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
      <Typography variant="h4" gutterBottom>
        Fraud Detection & Alerts
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                {alerts.filter(a => a.fraudScore >= 80).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Critical Alerts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {alerts.filter(a => a.status === 'pending').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Review
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {alerts.filter(a => a.status === 'investigating').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Under Investigation
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {alerts.filter(a => a.status === 'resolved').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Resolved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Severity</InputLabel>
          <Select
            value={filterSeverity}
            label="Severity"
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <MenuItem value="all">All Severities</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="investigating">Investigating</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
            <MenuItem value="false_positive">False Positive</MenuItem>
          </Select>
        </FormControl>

        <Button 
          variant="outlined" 
          onClick={fetchFraudAlerts}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Alerts Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Alert ID</TableCell>
              <TableCell>Visit ID</TableCell>
              <TableCell>CHW ID</TableCell>
              <TableCell>Fraud Score</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Detection Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAlerts.map((alert) => (
              <TableRow key={alert.alertId} hover>
                <TableCell>{alert.alertId}</TableCell>
                <TableCell>{alert.visitId}</TableCell>
                <TableCell>{alert.chwId}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {alert.fraudScore}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      / 100
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{getSeverityChip(alert.fraudScore)}</TableCell>
                <TableCell>{getStatusChip(alert.status)}</TableCell>
                <TableCell>{formatDate(alert.detectedAt)}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => {
                      setSelectedAlert(alert);
                      setDialogOpen(true);
                    }}
                  >
                    Investigate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Alert Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Fraud Alert Investigation
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box sx={{ pt: 2 }}>
              {/* Alert Overview */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Alert ID</Typography>
                  <Typography variant="body1">{selectedAlert.alertId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Fraud Score</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" color="error.main">
                      {selectedAlert.fraudScore}
                    </Typography>
                    {getSeverityChip(selectedAlert.fraudScore)}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Visit ID</Typography>
                  <Typography variant="body1">{selectedAlert.visitId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">CHW ID</Typography>
                  <Typography variant="body1">{selectedAlert.chwId}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Triggered Rules */}
              <Typography variant="h6" gutterBottom>
                Triggered Fraud Rules
              </Typography>
              <List>
                {selectedAlert.triggeredRules?.map((rule, index) => (
                  <ListItem key={index} divider>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      {getRuleIcon(rule.type)}
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {rule.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {rule.description}
                        </Typography>
                      </Box>
                      <Chip 
                        label={Score: } 
                        size="small" 
                        color={rule.score > 50 ? 'error' : 'warning'}
                      />
                    </Box>
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Evidence */}
              <Typography variant="h6" gutterBottom>
                Evidence & Context
              </Typography>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Location Data</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    Visit Location: {selectedAlert.evidence?.location || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    Expected Location: {selectedAlert.evidence?.expectedLocation || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    Distance Deviation: {selectedAlert.evidence?.locationDeviation || 'N/A'}
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Timing Analysis</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    Visit Time: {selectedAlert.evidence?.visitTime || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    Expected Pattern: {selectedAlert.evidence?.expectedPattern || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    Anomaly Type: {selectedAlert.evidence?.timeAnomaly || 'N/A'}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          <Button 
            onClick={() => handleResolveAlert(selectedAlert?.alertId, 'false_positive')}
            color="info"
          >
            Mark as False Positive
          </Button>
          <Button 
            onClick={() => handleResolveAlert(selectedAlert?.alertId, 'confirmed_fraud')}
            color="error"
            variant="contained"
          >
            Confirm Fraud
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FraudDetection;
