import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Settings() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    notifications: {
      emailAlerts: true,
      fraudAlerts: true,
      dailyDigest: false,
      visitAlerts: true
    },
    display: {
      darkMode: false,
      compactView: false,
      showCharts: true
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 60
    }
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Load settings from localStorage
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const saveSettings = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSnackbar({ open: true, message: 'Passwords do not match', severity: 'error' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setSnackbar({ open: true, message: 'Password must be at least 8 characters', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/auth/admin/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        getAuthHeaders()
      );
      
      setSnackbar({ open: true, message: 'Password changed successfully', severity: 'success' });
      setOpenPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Error changing password:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.error || 'Failed to change password', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <Box sx={{ p: 3, mt: 8 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Section */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                <PersonIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h6">{user?.username || 'Admin User'}</Typography>
              <Typography color="textSecondary" gutterBottom>
                {user?.role || 'Administrator'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {user?.email || 'admin@healthvisit.local'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                fullWidth
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Settings Sections */}
        <Grid item xs={12} md={8}>
          {/* Notification Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <NotificationsIcon sx={{ mr: 1 }} color="primary" />
              <Typography variant="h6">Notification Settings</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              <ListItem>
                <ListItemText 
                  primary="Email Alerts" 
                  secondary="Receive email notifications for important events"
                />
                <Switch
                  checked={settings.notifications.emailAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'emailAlerts', e.target.checked)}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Fraud Alerts" 
                  secondary="Get notified when potential fraud is detected"
                />
                <Switch
                  checked={settings.notifications.fraudAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'fraudAlerts', e.target.checked)}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Visit Alerts" 
                  secondary="Notifications for new visit submissions"
                />
                <Switch
                  checked={settings.notifications.visitAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'visitAlerts', e.target.checked)}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Daily Digest" 
                  secondary="Receive a daily summary email"
                />
                <Switch
                  checked={settings.notifications.dailyDigest}
                  onChange={(e) => handleSettingChange('notifications', 'dailyDigest', e.target.checked)}
                />
              </ListItem>
            </List>
          </Paper>

          {/* Display Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PaletteIcon sx={{ mr: 1 }} color="primary" />
              <Typography variant="h6">Display Settings</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              <ListItem>
                <ListItemText 
                  primary="Dark Mode" 
                  secondary="Use dark theme for the dashboard"
                />
                <Switch
                  checked={settings.display.darkMode}
                  onChange={(e) => handleSettingChange('display', 'darkMode', e.target.checked)}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Compact View" 
                  secondary="Use compact layout for tables"
                />
                <Switch
                  checked={settings.display.compactView}
                  onChange={(e) => handleSettingChange('display', 'compactView', e.target.checked)}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Show Charts" 
                  secondary="Display charts on dashboard"
                />
                <Switch
                  checked={settings.display.showCharts}
                  onChange={(e) => handleSettingChange('display', 'showCharts', e.target.checked)}
                />
              </ListItem>
            </List>
          </Paper>

          {/* Security Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SecurityIcon sx={{ mr: 1 }} color="primary" />
              <Typography variant="h6">Security Settings</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              <ListItem>
                <ListItemText 
                  primary="Two-Factor Authentication" 
                  secondary="Add an extra layer of security to your account"
                />
                <Switch
                  checked={settings.security.twoFactorEnabled}
                  onChange={(e) => handleSettingChange('security', 'twoFactorEnabled', e.target.checked)}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Session Timeout" 
                  secondary="Auto logout after inactivity (minutes)"
                />
                <TextField
                  type="number"
                  size="small"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  sx={{ width: 100 }}
                  inputProps={{ min: 5, max: 480 }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Change Password" 
                  secondary="Update your account password"
                />
                <Button
                  variant="outlined"
                  onClick={() => setOpenPasswordDialog(true)}
                >
                  Change
                </Button>
              </ListItem>
            </List>
          </Paper>

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={saveSettings}
              size="large"
            >
              Save Settings
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Current Password"
            type={showPasswords.current ? 'text' : 'password'}
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            sx={{ mt: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => togglePasswordVisibility('current')}>
                    {showPasswords.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <TextField
            fullWidth
            label="New Password"
            type={showPasswords.new ? 'text' : 'password'}
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            sx={{ mt: 2 }}
            helperText="Minimum 8 characters"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => togglePasswordVisibility('new')}>
                    {showPasswords.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <TextField
            fullWidth
            label="Confirm New Password"
            type={showPasswords.confirm ? 'text' : 'password'}
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            sx={{ mt: 2 }}
            error={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== ''}
            helperText={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== '' ? 'Passwords do not match' : ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => togglePasswordVisibility('confirm')}>
                    {showPasswords.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPasswordDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handlePasswordChange}
            disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default Settings;
