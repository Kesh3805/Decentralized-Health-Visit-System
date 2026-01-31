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
  Menu,
  MenuItem as DropdownMenuItem
} from '@mui/material';
import { 
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const CHWs = () => {
  const [chws, setChws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChw, setSelectedChw] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    specialization: '',
    isActive: true
  });

  useEffect(() => {
    fetchChws();
  }, [page, statusFilter]);

  const fetchChws = async () => {
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

      const response = await axios.get(`${API_BASE_URL}/api/admin/chws?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setChws(response.data.chws);
      setTotalPages(response.data.pagination.pages);
      setLoading(false);
    } catch (err) {
      console.error('Fetch CHWs error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication failed. Please login again.');
      } else {
        setError('Failed to load CHWs data');
      }
      setLoading(false);
    }
  };

  const handleAddChw = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.post(`${API_BASE_URL}/api/admin/chws`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      fetchChws();
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Add CHW error:', err);
      setError('Failed to add CHW');
    }
  };

  const handleEditChw = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.patch(`${API_BASE_URL}/api/admin/chws/${selectedChw.chwId}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      fetchChws();
      setDialogOpen(false);
      resetForm();
      setSelectedChw(null);
    } catch (err) {
      console.error('Edit CHW error:', err);
      setError('Failed to update CHW');
    }
  };

  const handleDeleteChw = async (chwId) => {
    if (!window.confirm('Are you sure you want to delete this CHW?')) return;
    
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.delete(`${API_BASE_URL}/api/admin/chws/${chwId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      fetchChws();
    } catch (err) {
      console.error('Delete CHW error:', err);
      setError('Failed to delete CHW');
    }
  };

  const handleToggleStatus = async (chw) => {
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.patch(`${API_BASE_URL}/api/admin/chws/${chw.chwId}`, {
        isActive: !chw.isActive
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      fetchChws();
    } catch (err) {
      console.error('Toggle status error:', err);
      setError('Failed to update CHW status');
    }
  };

  const openEditDialog = (chw) => {
    setSelectedChw(chw);
    setFormData({
      name: chw.name || '',
      email: chw.email || '',
      phone: chw.phone || '',
      location: chw.location || '',
      specialization: chw.specialization || '',
      isActive: chw.isActive
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      location: '',
      specialization: '',
      isActive: true
    });
  };

  const getStatusChip = (isActive, isVerified) => {
    if (!isActive) {
      return <Chip label="Inactive" color="error" size="small" />;
    }
    if (isVerified) {
      return <Chip label="Verified" color="success" size="small" icon={<VerifiedIcon />} />;
    }
    return <Chip label="Active" color="primary" size="small" icon={<CheckCircleIcon />} />;
  };

  const formatJoinDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredChws = chws.filter(chw => 
    chw.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chw.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chw.chwId?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Community Health Workers
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => {
            resetForm();
            setSelectedChw(null);
            setDialogOpen(true);
          }}
        >
          Add CHW
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {chws.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total CHWs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {chws.filter(c => c.isActive).length}
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
                {chws.filter(c => c.isVerified).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verified CHWs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {chws.filter(c => !c.isActive).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inactive CHWs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search CHWs..."
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
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="verified">Verified</MenuItem>
          </Select>
        </FormControl>

        <Button 
          variant="outlined" 
          onClick={fetchChws}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>CHW ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Specialization</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Join Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredChws.map((chw) => (
              <TableRow key={chw.chwId} hover>
                <TableCell>{chw.chwId}</TableCell>
                <TableCell>{chw.name}</TableCell>
                <TableCell>{chw.email}</TableCell>
                <TableCell>{chw.phone}</TableCell>
                <TableCell>{chw.location}</TableCell>
                <TableCell>{chw.specialization || 'General'}</TableCell>
                <TableCell>
                  {getStatusChip(chw.isActive, chw.isVerified)}
                </TableCell>
                <TableCell>{formatJoinDate(chw.createdAt)}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEditDialog(chw)} title="Edit">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleToggleStatus(chw)}
                    title={chw.isActive ? 'Deactivate' : 'Activate'}
                    color={chw.isActive ? 'error' : 'success'}
                  >
                    {chw.isActive ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                  </IconButton>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedChw ? 'Edit CHW' : 'Add New CHW'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!selectedChw}
            />
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              fullWidth
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <TextField
              fullWidth
              label="Specialization"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); setSelectedChw(null); resetForm(); }}>
            Cancel
          </Button>
          <Button 
            onClick={selectedChw ? handleEditChw : handleAddChw} 
            variant="contained"
            disabled={!formData.name || !formData.email}
          >
            {selectedChw ? 'Update CHW' : 'Add CHW'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CHWs;
