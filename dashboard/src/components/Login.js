import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Alert,
  CircularProgress 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Simple validation
    if (!username || !password) {
      setError('Please enter both username/email and password');
      return;
    }
    
    setLoading(true);
    
    try {
      // Authenticate with backend API
      const response = await axios.post(`${API_BASE_URL}/api/auth/admin/login`, {
        username,
        password
      });
      
      const { token, user } = response.data;
      
      const userData = {
        id: user.id,
        adminId: user.adminId,
        name: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        token
      };
      
      onLogin(userData);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.status === 401) {
        setError('Invalid credentials. Please try again.');
      } else if (err.response?.status === 423) {
        setError('Account temporarily locked. Please try again later.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please ensure the backend is running.');
      } else {
        setError(err.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Health Visit Admin
          </Typography>
          
          <Typography variant="body1" align="center" color="text.secondary" gutterBottom>
            Verification Dashboard
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username or Email"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
          
          <Typography variant="body2" align="center" sx={{ mt: 3 }} color="text.secondary">
            Use your admin credentials to login.
            <br />
            Run `npm run seed:admin` to create a default admin.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
