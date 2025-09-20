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
  CardContent
} from '@mui/material';
import { 
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import axios from 'axios';

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

      const response = await axios.get(http://localhost:3001/api/admin/visits?, {
        headers: {
          'Authorization': Bearer 
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
      return ${location.coordinates.latitude.toFixed(4)}, ;
    }
    return 'N/A';
  };

  const filteredVisits = visits.filter(visit => 
    visit.visitId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.chwId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.patientId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    </Box>
  );
};

export default Visits;
