import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Button,
  Alert,
  PermissionsAndroid,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://10.0.2.2:3001'; // Use 10.0.2.2 for Android emulator

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [chwId, setChwId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, scanner, visits, profile
  const [location, setLocation] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [visits, setVisits] = useState([]);
  const [pendingVisit, setPendingVisit] = useState(null);

  // Initialize app
  useEffect(() => {
    loadStoredAuth();
    requestLocationPermission();
  }, []);

  // Load stored authentication
  const loadStoredAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const storedChwId = await AsyncStorage.getItem('chw_id');
      
      if (token && storedChwId) {
        setAuthToken(token);
        setChwId(storedChwId);
        setIsAuthenticated(true);
        await loadVisits();
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    }
  };

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location for visit verification',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      getCurrentLocation();
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
      },
      error => {
        console.error('Location error:', error);
        Alert.alert('Location Error', 'Unable to get current location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  // Login function
  const login = async () => {
    if (!chwId || !password) {
      Alert.alert('Error', 'Please enter CHW ID and password');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(${API_BASE_URL}/api/auth/chw/login, {
        chwId,
        password
      });

      if (response.data.success) {
        const { token } = response.data;
        
        setAuthToken(token);
        setIsAuthenticated(true);
        
        // Store credentials
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('chw_id', chwId);
        
        // Load user data
        await loadVisits();
        
        Alert.alert('Success', 'Login successful');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'chw_id']);
      setIsAuthenticated(false);
      setAuthToken(null);
      setChwId('');
      setPassword('');
      setVisits([]);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Load visits
  const loadVisits = async () => {
    try {
      const response = await axios.get(${API_BASE_URL}/api/visits, {
        headers: {
          'Authorization': Bearer 
        }
      });

      if (response.data.success) {
        setVisits(response.data.visits);
      }
    } catch (error) {
      console.error('Load visits error:', error);
    }
  };

  // Handle QR scan
  const onQRScanSuccess = async (e) => {
    setIsScanning(false);
    
    try {
      // Parse QR data
      const qrData = JSON.parse(e.data);
      
      // Verify the patient tag
      const verifyResponse = await axios.post(${API_BASE_URL}/api/patients/verify-tag, {
        patientId: qrData.patientId,
        token: qrData.token,
        secret: qrData.secret
      }, {
        headers: {
          'Authorization': Bearer 
        }
      });

      if (verifyResponse.data.valid) {
        // Create pending visit
        const visit = {
          patientId: qrData.patientId,
          timestamp: new Date().toISOString(),
          location: location || { latitude: 0, longitude: 0 }
        };
        
        setPendingVisit(visit);
        Alert.alert('Success', 'Patient verified! Ready to log visit.');
      } else {
        Alert.alert('Error', 'Invalid or expired patient tag');
      }
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert('Error', 'Failed to verify patient tag');
    }
  };

  // Submit visit
  const submitVisit = async () => {
    if (!pendingVisit) return;

    setLoading(true);
    try {
      const visitData = {
        ...pendingVisit,
        chwId
      };

      const response = await axios.post(${API_BASE_URL}/api/visits, visitData, {
        headers: {
          'Authorization': Bearer 
        }
      });

      if (response.data.success) {
        Alert.alert('Success', 'Visit logged successfully!');
        setPendingVisit(null);
        await loadVisits(); // Refresh visits list
        setCurrentView('visits');
      }
    } catch (error) {
      console.error('Submit visit error:', error);
      Alert.alert('Error', 'Failed to log visit');
    } finally {
      setLoading(false);
    }
  };

  // Generate patient tag (for testing)
  const generatePatientTag = async () => {
    try {
      const response = await axios.post(${API_BASE_URL}/api/patients/generate-tag, {
        patientId: 'TEST_' + Date.now(),
        patientName: 'Test Patient'
      }, {
        headers: {
          'Authorization': Bearer 
        }
      });

      if (response.data.success) {
        const qrData = JSON.stringify({
          patientId: response.data.patientId,
          token: response.data.token,
          secret: response.data.secret
        });
        
        Alert.alert('QR Data Generated', qrData);
      }
    } catch (error) {
      console.error('Generate tag error:', error);
      Alert.alert('Error', 'Failed to generate patient tag');
    }
  };

  // Render login screen
  const renderLogin = () => (
    <View style={styles.loginContainer}>
      <Text style={styles.loginTitle}>CHW Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="CHW ID"
        value={chwId}
        onChangeText={setChwId}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={styles.loginButton}
        onPress={login}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // Render navigation
  const renderNavigation = () => (
    <View style={styles.navigation}>
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'dashboard' && styles.navButtonActive]}
        onPress={() => setCurrentView('dashboard')}
      >
        <Text style={styles.navButtonText}>Dashboard</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'scanner' && styles.navButtonActive]}
        onPress={() => setCurrentView('scanner')}
      >
        <Text style={styles.navButtonText}>Scan</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'visits' && styles.navButtonActive]}
        onPress={() => setCurrentView('visits')}
      >
        <Text style={styles.navButtonText}>Visits</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, currentView === 'profile' && styles.navButtonActive]}
        onPress={() => setCurrentView('profile')}
      >
        <Text style={styles.navButtonText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );

  // Render dashboard
  const renderDashboard = () => (
    <View style={styles.dashboard}>
      <Text style={styles.welcomeText}>Welcome, CHW {chwId}</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{visits.length}</Text>
          <Text style={styles.statLabel}>Total Visits</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {visits.filter(v => v.isVerified).length}
          </Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
      </View>

      <View style={styles.locationCard}>
        <Text style={styles.cardTitle}>Current Location</Text>
        {location ? (
          <Text style={styles.locationText}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.locationText}>Getting location...</Text>
        )}
        <TouchableOpacity style={styles.refreshButton} onPress={getCurrentLocation}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {pendingVisit && (
        <View style={styles.pendingVisitCard}>
          <Text style={styles.cardTitle}>Pending Visit</Text>
          <Text>Patient: {pendingVisit.patientId}</Text>
          <Text>Time: {new Date(pendingVisit.timestamp).toLocaleString()}</Text>
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={submitVisit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Visit</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render scanner
  const renderScanner = () => (
    <View style={styles.scannerContainer}>
      {isScanning ? (
        <QRCodeScanner
          onRead={onQRScanSuccess}
          flashMode={RNCamera.Constants.FlashMode.auto}
          topContent={
            <Text style={styles.scannerText}>
              Scan patient's QR code
            </Text>
          }
          bottomContent={
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsScanning(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <View style={styles.scannerMenu}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setIsScanning(true)}
          >
            <Text style={styles.scanButtonText}>Scan Patient QR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={generatePatientTag}
          >
            <Text style={styles.testButtonText}>Generate Test QR</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render visits list
  const renderVisits = () => (
    <View style={styles.visitsContainer}>
      <Text style={styles.sectionTitle}>My Visits</Text>
      
      <FlatList
        data={visits}
        keyExtractor={(item) => item.visitId}
        renderItem={({ item }) => (
          <View style={styles.visitCard}>
            <Text style={styles.visitPatient}>Patient: {item.patientId}</Text>
            <Text style={styles.visitTime}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
            <Text style={[
              styles.visitStatus,
              { color: item.isVerified ? '#4CAF50' : '#FF9800' }
            ]}>
              {item.isVerified ? 'Verified' : 'Pending'}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No visits recorded yet</Text>
        }
      />
    </View>
  );

  // Render profile
  const renderProfile = () => (
    <View style={styles.profileContainer}>
      <Text style={styles.sectionTitle}>Profile</Text>
      
      <View style={styles.profileCard}>
        <Text style={styles.profileLabel}>CHW ID</Text>
        <Text style={styles.profileValue}>{chwId}</Text>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  // Render main content
  const renderContent = () => {
    switch (currentView) {
      case 'scanner':
        return renderScanner();
      case 'visits':
        return renderVisits();
      case 'profile':
        return renderProfile();
      default:
        return renderDashboard();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health Visit App</Text>
      </View>

      {!isAuthenticated ? (
        renderLogin()
      ) : (
        <View style={styles.mainContainer}>
          {renderNavigation()}
          <ScrollView style={styles.content}>
            {renderContent()}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  mainContainer: {
    flex: 1,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  loginButton: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  navButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  dashboard: {
    padding: 16,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    marginRight: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  locationCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 12,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
  },
  refreshButtonText: {
    fontSize: 12,
  },
  pendingVisitCard: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scannerContainer: {
    flex: 1,
  },
  scannerMenu: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scanButton: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#757575',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
  },
  scannerText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 6,
    marginTop: 20,
  },
  cancelButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  visitsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  visitCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  visitPatient: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  visitTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  visitStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
  },
  profileContainer: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
  },
  profileValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#f44336',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;
