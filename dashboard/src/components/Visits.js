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
  TextField, 
  InputAdornment, 
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  LinearProgress
} from '@mui/material';
import { 
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  VerifiedUser as VerifiedUserIcon,
  LinkOff as LinkOffIcon,
  Link as LinkIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const Visits = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [blockchainStatus, setBlockchainStatus] = useState(null);
  const [loadingBlockchain, setLoadingBlockchain] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  useEffect(() => {
    fetchVisits();
  }, [page, statusFilter]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await axios.get(`${API_BASE_URL}/api/admin/visits?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setVisits(response.data.visits);
      setTotalPages(response.data.pagination.pages);
      setLoading(false);
    } catch (err) {
      console.error('Fetch visits error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication failed. Please login again.');
      } else {
        setError('Failed to load visits data');
      }
      setLoading(false);
    }
  };

  const getStatusChip = (status, isVerified, fraudScore) => {
    if (fraudScore > 70) {
      return <Chip label="Flagged" color="error" size="small" icon={<ErrorIcon />} />;
    }
    if (isVerified) {
      return <Chip label="Verified" color="success" size="small" icon={<CheckCircleIcon />} />;
    }
    if (status === 'pending') {
      return <Chip label="Pending" color="warning" size="small" icon={<WarningIcon />} />;
    }
    return <Chip label={status} color="default" size="small" />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatLocation = (location) => {
    if (location?.coordinates) {
      return `${location.coordinates.latitude.toFixed(4)}, ${location.coordinates.longitude.toFixed(4)}`;
    }
    return 'N/A';
  };

  const filteredVisits = visits.filter(visit => 
    visit.visitId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.chwId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.patientId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewVisit = async (visit) => {
    setSelectedVisit(visit);
    setDialogOpen(true);
    setBlockchainStatus(null);
    setLoadingBlockchain(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/api/admin/visits/${visit.visitId}/blockchain-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setBlockchainStatus(response.data.blockchainStatus);
    } catch (err) {
      console.error('Blockchain status error:', err);
      setBlockchainStatus({ error: 'Failed to check blockchain status' });
    } finally {
      setLoadingBlockchain(false);
    }
  };

  const handleVerifyVisit = async () => {
    if (!selectedVisit) return;
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${API_BASE_URL}/api/admin/visits/${selectedVisit.visitId}/verify`, 
        { notes: verificationNotes },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      fetchVisits();
      setDialogOpen(false);
      setVerificationNotes('');
    } catch (err) {
      console.error('Verify visit error:', err);
      setError('Failed to verify visit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordOnBlockchain = async () => {
    if (!selectedVisit) return;
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${API_BASE_URL}/api/admin/visits/${selectedVisit.visitId}/record-blockchain`, {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Refresh blockchain status
      const response = await axios.get(`${API_BASE_URL}/api/admin/visits/${selectedVisit.visitId}/blockchain-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setBlockchainStatus(response.data.blockchainStatus);
      fetchVisits();
    } catch (err) {
      console.error('Record blockchain error:', err);
      setError(err.response?.data?.error || 'Failed to record on blockchain');
    } finally {
      setActionLoading(false);
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
      <Typography variant="h4" gutterBottom>
        Visit Management
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {visits.length}
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
                {visits.filter(v => v.isVerified).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verified
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {visits.filter(v => v.status === 'pending').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                {visits.filter(v => v.fraudScore > 70).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Flagged
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search visits..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="verified">Verified</MenuItem>
            <MenuItem value="flagged">Flagged</MenuItem>
          </Select>
        </FormControl>

        <Button 
          variant="outlined" 
          onClick={fetchVisits}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Visit ID</TableCell>
              <TableCell>CHW ID</TableCell>
              <TableCell>Patient ID</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Fraud Score</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVisits.map((visit) => (
              <TableRow key={visit.visitId} hover>
                <TableCell>{visit.visitId}</TableCell>
                <TableCell>{visit.chwId}</TableCell>
                <TableCell>{visit.patientId}</TableCell>
                <TableCell>{formatDate(visit.timestamp)}</TableCell>
                <TableCell>{formatLocation(visit.location)}</TableCell>
                <TableCell>
                  {getStatusChip(visit.status, visit.isVerified, visit.fraudScore)}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={visit.fraudScore || 0} 
                    color={visit.fraudScore > 70 ? 'error' : visit.fraudScore > 30 ? 'warning' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => handleViewVisit(visit)}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(event, value) => setPage(value)}
          color="primary"
        />
      </Box>

      {/* Visit Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Visit Details
          {selectedVisit?.isVerified && (
            <Chip 
              label="Verified" 
              color="success" 
              size="small" 
              icon={<CheckCircleIcon />}
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {selectedVisit && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Visit Information</Typography>
                <Divider sx={{ my: 1 }} />
                <List dense>
                  <ListItem>
                    <ListItemText primary="Visit ID" secondary={selectedVisit.visitId} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="CHW ID" secondary={selectedVisit.chwId} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Patient ID" secondary={selectedVisit.patientId} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Timestamp" secondary={formatDate(selectedVisit.timestamp)} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Location" secondary={formatLocation(selectedVisit.location)} />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Visit Type" 
                      secondary={selectedVisit.visitType || 'General Check-up'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Notes" 
                      secondary={selectedVisit.notes || 'No notes'} 
                    />
                  </ListItem>
                </List>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Blockchain Verification
                </Typography>
                <Divider sx={{ my: 1 }} />
                
                {loadingBlockchain ? (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress />
                    <Typography variant="body2" sx={{ mt: 1 }}>Checking blockchain status...</Typography>
                  </Box>
                ) : blockchainStatus ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 1 }}>
                      {blockchainStatus.isOnBlockchain ? (
                        <>
                          <LinkIcon color="success" sx={{ mr: 1 }} />
                          <Typography variant="body1" color="success.main">
                            Recorded on Blockchain
                          </Typography>
                        </>
                      ) : (
                        <>
                          <LinkOffIcon color="warning" sx={{ mr: 1 }} />
                          <Typography variant="body1" color="warning.main">
                            Not on Blockchain
                          </Typography>
                        </>
                      )}
                    </Box>
                    
                    {blockchainStatus.isOnBlockchain && (
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Block Number" 
                            secondary={blockchainStatus.blockNumber} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Transaction Hash" 
                            secondary={
                              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                {blockchainStatus.transactionHash}
                              </Typography>
                            } 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Block Timestamp" 
                            secondary={blockchainStatus.blockTimestamp ? formatDate(blockchainStatus.blockTimestamp) : 'N/A'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Contract Verified" 
                            secondary={blockchainStatus.contractVerified ? 'Yes' : 'No'} 
                          />
                        </ListItem>
                      </List>
                    )}
                    
                    {blockchainStatus.error && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        {blockchainStatus.error}
                      </Alert>
                    )}
                    
                    {!blockchainStatus.isOnBlockchain && !blockchainStatus.error && (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CloudUploadIcon />}
                        onClick={handleRecordOnBlockchain}
                        disabled={actionLoading}
                        sx={{ mt: 2 }}
                      >
                        {actionLoading ? 'Recording...' : 'Record on Blockchain'}
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Unable to check blockchain status
                  </Typography>
                )}
                
                {!selectedVisit.isVerified && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Manual Verification
                    </Typography>
                    <TextField
                      fullWidth
                      label="Verification Notes"
                      multiline
                      rows={2}
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      sx={{ mt: 1 }}
                    />
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<VerifiedUserIcon />}
                      onClick={handleVerifyVisit}
                      disabled={actionLoading}
                      sx={{ mt: 2 }}
                    >
                      {actionLoading ? 'Verifying...' : 'Verify Visit'}
                    </Button>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Visits;
