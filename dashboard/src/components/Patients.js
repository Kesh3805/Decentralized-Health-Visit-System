import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  QrCode as QrCodeIcon,
  Nfc as NfcIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPatients, setTotalPatients] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dialogMode, setDialogMode] = useState('add');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [stats, setStats] = useState({ total: 0, active: 0, withNfc: 0, needsVisit: 0 });

  const [formData, setFormData] = useState({
    patientId: '',
    demographics: {
      ageGroup: '',
      gender: ''
    },
    location: {
      region: '',
      district: ''
    },
    contactInfo: {
      phone: '',
      alternateContact: ''
    },
    consentGiven: false
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/patients?page=${page + 1}&limit=${rowsPerPage}&search=${searchQuery}`,
        getAuthHeaders()
      );
      setPatients(response.data.patients || []);
      setTotalPatients(response.data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/patients/stats`,
        getAuthHeaders()
      );
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching patient stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
    fetchStats();
  }, [fetchPatients, fetchStats]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleOpenDialog = (mode, patient = null) => {
    setDialogMode(mode);
    if (patient) {
      setFormData({
        patientId: patient.patientId || '',
        demographics: {
          ageGroup: patient.demographics?.ageGroup || '',
          gender: patient.demographics?.gender || ''
        },
        location: {
          region: patient.location?.region || '',
          district: patient.location?.district || ''
        },
        contactInfo: {
          phone: patient.contactInfo?.phone || '',
          alternateContact: patient.contactInfo?.alternateContact || ''
        },
        consentGiven: patient.consentGiven || false
      });
      setSelectedPatient(patient);
    } else {
      setFormData({
        patientId: `PAT-${Date.now()}`,
        demographics: { ageGroup: '', gender: '' },
        location: { region: '', district: '' },
        contactInfo: { phone: '', alternateContact: '' },
        consentGiven: false
      });
      setSelectedPatient(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPatient(null);
  };

  const handleViewPatient = (patient) => {
    setSelectedPatient(patient);
    setOpenViewDialog(true);
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async () => {
    try {
      if (dialogMode === 'add') {
        await axios.post(
          `${API_BASE_URL}/api/admin/patients`,
          formData,
          getAuthHeaders()
        );
        setSnackbar({ open: true, message: 'Patient registered successfully', severity: 'success' });
      } else {
        await axios.patch(
          `${API_BASE_URL}/api/admin/patients/${selectedPatient._id}`,
          formData,
          getAuthHeaders()
        );
        setSnackbar({ open: true, message: 'Patient updated successfully', severity: 'success' });
      }
      handleCloseDialog();
      fetchPatients();
      fetchStats();
    } catch (err) {
      console.error('Error saving patient:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.error || 'Failed to save patient', 
        severity: 'error' 
      });
    }
  };

  const handleDelete = async (patientId) => {
    if (!window.confirm('Are you sure you want to deactivate this patient?')) return;
    
    try {
      await axios.delete(
        `${API_BASE_URL}/api/admin/patients/${patientId}`,
        getAuthHeaders()
      );
      setSnackbar({ open: true, message: 'Patient deactivated successfully', severity: 'success' });
      fetchPatients();
      fetchStats();
    } catch (err) {
      console.error('Error deleting patient:', err);
      setSnackbar({ open: true, message: 'Failed to deactivate patient', severity: 'error' });
    }
  };

  const handleGenerateQR = async (patientId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/patients/${patientId}/generate-qr`,
        {},
        getAuthHeaders()
      );
      setSnackbar({ open: true, message: 'QR code generated successfully', severity: 'success' });
      
      // If QR code image is returned, offer download
      if (response.data.qrCode) {
        const link = document.createElement('a');
        link.href = response.data.qrCode;
        link.download = `patient-${patientId}-qr.png`;
        link.click();
      }
      
      fetchPatients();
    } catch (err) {
      console.error('Error generating QR:', err);
      setSnackbar({ open: true, message: 'Failed to generate QR code', severity: 'error' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box sx={{ p: 3, mt: 8 }}>
      <Typography variant="h4" gutterBottom>
        Patient Management
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Patients</Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Active Patients</Typography>
              <Typography variant="h4" color="success.main">{stats.active}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>With NFC Tags</Typography>
              <Typography variant="h4" color="primary.main">{stats.withNfc}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Needs Visit</Typography>
              <Typography variant="h4" color="warning.main">{stats.needsVisit}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Action Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search patients by ID, region, or phone..."
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => { fetchPatients(); fetchStats(); }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('add')}
            >
              Register Patient
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Patients Table */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Patient ID</TableCell>
                  <TableCell>Demographics</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Total Visits</TableCell>
                  <TableCell>Last Visit</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="textSecondary">No patients found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  patients.map((patient) => (
                    <TableRow key={patient._id} hover>
                      <TableCell>
                        <Typography fontWeight="bold">{patient.patientId}</Typography>
                      </TableCell>
                      <TableCell>
                        {patient.demographics?.gender && (
                          <Chip 
                            label={patient.demographics.gender} 
                            size="small" 
                            sx={{ mr: 0.5 }} 
                          />
                        )}
                        {patient.demographics?.ageGroup && (
                          <Chip 
                            label={patient.demographics.ageGroup} 
                            size="small" 
                            variant="outlined" 
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.location?.region && (
                          <Typography variant="body2">
                            {patient.location.region}
                            {patient.location.district && `, ${patient.location.district}`}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{patient.contactInfo?.phone || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={patient.qrCode?.isActive ? 'QR Active' : 'QR Inactive'}>
                          <QrCodeIcon 
                            color={patient.qrCode?.isActive ? 'success' : 'disabled'} 
                            sx={{ mr: 1 }}
                          />
                        </Tooltip>
                        <Tooltip title={patient.nfcTag?.isActive ? 'NFC Active' : 'No NFC'}>
                          <NfcIcon 
                            color={patient.nfcTag?.isActive ? 'primary' : 'disabled'}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>{patient.totalVisits || 0}</TableCell>
                      <TableCell>{formatDate(patient.lastVisitDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={patient.isActive ? 'Active' : 'Inactive'}
                          color={patient.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewPatient(patient)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenDialog('edit', patient)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Generate QR">
                          <IconButton size="small" onClick={() => handleGenerateQR(patient._id)}>
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate">
                          <IconButton size="small" color="error" onClick={() => handleDelete(patient._id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalPatients}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </TableContainer>

      {/* Add/Edit Patient Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Register New Patient' : 'Edit Patient'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Patient ID"
                value={formData.patientId}
                onChange={(e) => handleInputChange('patientId', e.target.value)}
                disabled={dialogMode === 'edit'}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                Demographics
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Age Group</InputLabel>
                <Select
                  value={formData.demographics.ageGroup}
                  label="Age Group"
                  onChange={(e) => handleInputChange('demographics.ageGroup', e.target.value)}
                >
                  <MenuItem value="0-5">0-5 years</MenuItem>
                  <MenuItem value="6-17">6-17 years</MenuItem>
                  <MenuItem value="18-35">18-35 years</MenuItem>
                  <MenuItem value="36-50">36-50 years</MenuItem>
                  <MenuItem value="51-65">51-65 years</MenuItem>
                  <MenuItem value="65+">65+ years</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={formData.demographics.gender}
                  label="Gender"
                  onChange={(e) => handleInputChange('demographics.gender', e.target.value)}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                  <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                Location
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Region"
                value={formData.location.region}
                onChange={(e) => handleInputChange('location.region', e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="District"
                value={formData.location.district}
                onChange={(e) => handleInputChange('location.district', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                Contact Information
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.contactInfo.phone}
                onChange={(e) => handleInputChange('contactInfo.phone', e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Alternate Contact"
                value={formData.contactInfo.alternateContact}
                onChange={(e) => handleInputChange('contactInfo.alternateContact', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Consent Given</InputLabel>
                <Select
                  value={formData.consentGiven}
                  label="Consent Given"
                  onChange={(e) => handleInputChange('consentGiven', e.target.value)}
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {dialogMode === 'add' ? 'Register' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Patient Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Patient Details</DialogTitle>
        <DialogContent>
          {selectedPatient && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">Patient ID</Typography>
                <Typography variant="body1">{selectedPatient.patientId}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Chip 
                  label={selectedPatient.isActive ? 'Active' : 'Inactive'} 
                  color={selectedPatient.isActive ? 'success' : 'default'} 
                  size="small" 
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">Age Group</Typography>
                <Typography variant="body1">{selectedPatient.demographics?.ageGroup || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">Gender</Typography>
                <Typography variant="body1">{selectedPatient.demographics?.gender || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">Region</Typography>
                <Typography variant="body1">{selectedPatient.location?.region || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">District</Typography>
                <Typography variant="body1">{selectedPatient.location?.district || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">Phone</Typography>
                <Typography variant="body1">{selectedPatient.contactInfo?.phone || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">Alternate Contact</Typography>
                <Typography variant="body1">{selectedPatient.contactInfo?.alternateContact || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">Total Visits</Typography>
                <Typography variant="body1">{selectedPatient.totalVisits || 0}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">Last Visit</Typography>
                <Typography variant="body1">{formatDate(selectedPatient.lastVisitDate)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">QR Code Status</Typography>
                <Chip 
                  icon={<QrCodeIcon />}
                  label={selectedPatient.qrCode?.isActive ? 'Active' : 'Inactive'} 
                  color={selectedPatient.qrCode?.isActive ? 'success' : 'default'} 
                  size="small" 
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">NFC Tag Status</Typography>
                <Chip 
                  icon={<NfcIcon />}
                  label={selectedPatient.nfcTag?.isActive ? 'Active' : 'Not Assigned'} 
                  color={selectedPatient.nfcTag?.isActive ? 'primary' : 'default'} 
                  size="small" 
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">Enrollment Date</Typography>
                <Typography variant="body1">{formatDate(selectedPatient.enrollmentDate)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">Consent Given</Typography>
                <Typography variant="body1">{selectedPatient.consentGiven ? 'Yes' : 'No'}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={() => selectedPatient && handleGenerateQR(selectedPatient._id)}
          >
            Download QR Code
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Patients;
