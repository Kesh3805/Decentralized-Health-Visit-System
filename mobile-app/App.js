import React, { useState, useEffect, useCallback } from 'react';
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
  FlatList,
  Modal,
  RefreshControl
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://10.0.2.2:3001'; // Use 10.0.2.2 for Android emulator
const OFFLINE_VISITS_KEY = 'offline_visits';
const SYNC_INTERVAL = 30000; // 30 seconds

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [chwId, setChwId] = useState('');
  const [chwName, setChwName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [location, setLocation] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState('qr'); // 'qr' or 'nfc'
  const [visits, setVisits] = useState([]);
  const [pendingVisit, setPendingVisit] = useState(null);
  const [offlineVisits, setOfflineVisits] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitNotes, setVisitNotes] = useState('');
  const [visitType, setVisitType] = useState('routine_checkup');
  const [selectedServices, setSelectedServices] = useState([]);

  const serviceOptions = [
    'health_screening',
    'vaccination',
    'prenatal_care',
    'postnatal_care',
    'nutrition_counseling',
    'medication_delivery',
    'wound_care',
    'health_education',
    'referral'
  ];

  // Initialize app
  useEffect(() => {
    loadStoredAuth();
    requestLocationPermission();
    loadOfflineVisits();
  }, []);

  // Sync offline visits periodically
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      const syncInterval = setInterval(syncOfflineVisits, SYNC_INTERVAL);
      return () => clearInterval(syncInterval);
    }
  }, [isAuthenticated, isOnline, authToken]);

  // Load stored authentication
  const loadStoredAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const storedChwId = await AsyncStorage.getItem('chw_id');
      const storedChwName = await AsyncStorage.getItem('chw_name');
      
      if (token && storedChwId) {
        setAuthToken(token);
        setChwId(storedChwId);
        setChwName(storedChwName || '');
        setIsAuthenticated(true);
        await loadVisits(token);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    }
  };

  // Load offline visits from storage
  const loadOfflineVisits = async () => {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_VISITS_KEY);
      if (stored) {
        setOfflineVisits(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading offline visits:', error);
    }
  };

  // Save offline visits to storage
  const saveOfflineVisits = async (visits) => {
    try {
      await AsyncStorage.setItem(OFFLINE_VISITS_KEY, JSON.stringify(visits));
      setOfflineVisits(visits);
    } catch (error) {
      console.error('Error saving offline visits:', error);
    }
  };

  // Sync offline visits with server
  const syncOfflineVisits = async () => {
    if (offlineVisits.length === 0 || !authToken) return;
    
    const successfulSyncs = [];
    
    for (const visit of offlineVisits) {
      try {
        await axios.post(`${API_BASE_URL}/api/visits`, visit.data, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        successfulSyncs.push(visit.id);
      } catch (error) {
        console.error('Failed to sync visit:', error);
      }
    }
    
    if (successfulSyncs.length > 0) {
      const remaining = offlineVisits.filter(v => !successfulSyncs.includes(v.id));
      await saveOfflineVisits(remaining);
      
      if (successfulSyncs.length === offlineVisits.length) {
        Alert.alert('Sync Complete', `Successfully synced ${successfulSyncs.length} offline visit(s)`);
      }
      
      await loadVisits();
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
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/chw/login`, {
        email: chwId,
        password
      });

      // Backend returns { message, token, user }
      const { token, user } = response.data;
      
      setAuthToken(token);
      setChwId(user.chwId);
      setChwName(user.name || '');
      setIsAuthenticated(true);
      setIsOnline(true);
      
      // Store credentials
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('chw_id', user.chwId);
      await AsyncStorage.setItem('chw_name', user.name || '');
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      
      // Load user data
      await loadVisits(token);
      
      // Sync any offline visits
      await syncOfflineVisits();
      
      Alert.alert('Success', 'Login successful');
    } catch (error) {
      console.error('Login error:', error);
      setIsOnline(false);
      Alert.alert('Login Failed', error.response?.data?.error || 'Invalid credentials or offline');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'chw_id', 'chw_name', 'user_data']);
      setIsAuthenticated(false);
      setAuthToken(null);
      setChwId('');
      setChwName('');
      setPassword('');
      setVisits([]);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Load visits with pull-to-refresh support
  const loadVisits = async (token = authToken) => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/visits`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Backend returns { visits, pagination }
      setVisits(response.data.visits || []);
      setIsOnline(true);
    } catch (error) {
      console.error('Load visits error:', error);
      setIsOnline(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVisits();
    await syncOfflineVisits();
    getCurrentLocation();
    setRefreshing(false);
  }, [authToken]);

  // Handle QR scan
  const onQRScanSuccess = async (e) => {
    setIsScanning(false);
    
    try {
      // Verify the patient tag
      const verifyResponse = await axios.post(`${API_BASE_URL}/api/patients/verify-tag`, {
        tagData: e.data,
        tagType: 'qr'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (verifyResponse.data.valid) {
        // Create pending visit with verified patient data
        const patient = verifyResponse.data.patient;
        const visit = {
          patientId: patient.patientId,
          patientName: patient.demographics?.gender ? `${patient.demographics.gender} - ${patient.demographics.ageGroup || 'Unknown'}` : 'Patient',
          timestamp: new Date().toISOString(),
          location: location || { latitude: 0, longitude: 0 },
          tagType: 'qr',
          tagData: e.data
        };
        
        setPendingVisit(visit);
        setShowVisitModal(true);
      } else {
        Alert.alert('Error', verifyResponse.data.error || 'Invalid or expired patient tag');
      }
    } catch (error) {
      console.error('QR scan error:', error);
      
      // Handle offline mode - allow visit to be saved locally
      if (!error.response) {
        Alert.alert(
          'Offline Mode',
          'Cannot verify patient online. Save visit for later sync?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Save Offline', 
              onPress: () => {
                const visit = {
                  patientId: `OFFLINE-${Date.now()}`,
                  patientName: 'Unverified Patient',
                  timestamp: new Date().toISOString(),
                  location: location || { latitude: 0, longitude: 0 },
                  tagType: 'qr',
                  tagData: e.data,
                  isOffline: true
                };
                setPendingVisit(visit);
                setShowVisitModal(true);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', error.response?.data?.error || 'Failed to verify patient tag');
      }
    }
  };

  // Handle NFC scan (simulated for now)
  const handleNFCScan = async () => {
    Alert.alert(
      'NFC Scan',
      'Hold your device near the patient\'s NFC tag',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Simulate Scan', 
          onPress: async () => {
            // In production, this would use react-native-nfc-manager
            const simulatedNfcUid = `NFC-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
            
            try {
              const verifyResponse = await axios.post(`${API_BASE_URL}/api/patients/verify-nfc`, {
                nfcUid: simulatedNfcUid
              }, {
                headers: { 'Authorization': `Bearer ${authToken}` }
              });
              
              if (verifyResponse.data.valid) {
                const patient = verifyResponse.data.patient;
                setPendingVisit({
                  patientId: patient.patientId,
                  patientName: patient.demographics?.gender || 'Patient',
                  timestamp: new Date().toISOString(),
                  location: location || { latitude: 0, longitude: 0 },
                  tagType: 'nfc',
                  tagData: simulatedNfcUid
                });
                setShowVisitModal(true);
              }
            } catch (error) {
              Alert.alert('NFC Error', 'NFC tag not recognized or not registered');
            }
          }
        }
      ]
    );
  };

  // Submit visit with full details
  const submitVisit = async () => {
    if (!pendingVisit) return;

    setLoading(true);
    try {
      // Prepare full visit data
      const visitData = {
        patientId: pendingVisit.patientId,
        location: {
          coordinates: {
            latitude: pendingVisit.location.latitude,
            longitude: pendingVisit.location.longitude
          },
          accuracy: 10
        },
        timestamp: pendingVisit.timestamp,
        signature: `sig_${Date.now()}`, // In production, this would be a real signature
        qrCode: pendingVisit.tagType === 'qr' ? pendingVisit.tagData : undefined,
        nfcTag: pendingVisit.tagType === 'nfc' ? pendingVisit.tagData : undefined,
        visitType: visitType,
        services: selectedServices.length > 0 ? selectedServices : ['health_screening'],
        notes: visitNotes,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version
        }
      };

      if (isOnline && !pendingVisit.isOffline) {
        const response = await axios.post(`${API_BASE_URL}/api/visits`, visitData, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        // Backend returns { message, visit, savedToDatabase, sentToBlockchain }
        Alert.alert('Success', response.data.message || 'Visit logged successfully!');
        await loadVisits(); // Refresh visits list
      } else {
        // Save offline
        const offlineVisit = {
          id: `offline_${Date.now()}`,
          data: visitData,
          savedAt: new Date().toISOString()
        };
        await saveOfflineVisits([...offlineVisits, offlineVisit]);
        Alert.alert('Saved Offline', 'Visit saved locally. Will sync when online.');
      }
      
      // Reset state
      setPendingVisit(null);
      setShowVisitModal(false);
      setVisitNotes('');
      setVisitType('routine_checkup');
      setSelectedServices([]);
      setCurrentView('visits');
    } catch (error) {
      console.error('Submit visit error:', error);
      
      // Save offline if network error
      if (!error.response) {
        const offlineVisit = {
          id: `offline_${Date.now()}`,
          data: {
            patientId: pendingVisit.patientId,
            location: { coordinates: pendingVisit.location },
            timestamp: pendingVisit.timestamp,
            visitType,
            services: selectedServices,
            notes: visitNotes
          },
          savedAt: new Date().toISOString()
        };
        await saveOfflineVisits([...offlineVisits, offlineVisit]);
        Alert.alert('Network Error', 'Visit saved offline. Will sync when connected.');
        setPendingVisit(null);
        setShowVisitModal(false);
      } else {
        Alert.alert('Error', error.response?.data?.error || 'Failed to log visit');
      }
    } finally {
      setLoading(false);
    }
  };

  // Toggle service selection
  const toggleService = (service) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  // Generate patient tag (for testing)
  const generatePatientTag = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/patients/generate-tag`, {
        patientId: 'TEST_' + Date.now(),
        tagType: 'qr'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Backend returns { message, patientId, qrCode, qrData, expiresAt, tagType }
      if (response.data.qrCode) {
        Alert.alert(
          'QR Generated',
          `Patient ID: ${response.data.patientId}\n\nUse the QR code to scan and log a visit.`
        );
      } else {
        Alert.alert('Generated', `QR Data: ${response.data.qrData}`);
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
    <ScrollView 
      style={styles.dashboard}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.welcomeText}>Welcome, {chwName || `CHW ${chwId}`}</Text>
      
      {/* Online/Offline Status */}
      <View style={[styles.statusBadge, { backgroundColor: isOnline ? '#4CAF50' : '#FF9800' }]}>
        <Text style={styles.statusText}>{isOnline ? '🟢 Online' : '🟡 Offline Mode'}</Text>
      </View>
      
      {/* Stats Row */}
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
        
        <View style={[styles.statCard, { backgroundColor: offlineVisits.length > 0 ? '#fff3e0' : 'white' }]}>
          <Text style={[styles.statNumber, { color: offlineVisits.length > 0 ? '#ff9800' : '#1976D2' }]}>
            {offlineVisits.length}
          </Text>
          <Text style={styles.statLabel}>Pending Sync</Text>
        </View>
      </View>

      {/* Offline Visits Alert */}
      {offlineVisits.length > 0 && (
        <TouchableOpacity 
          style={styles.offlineAlert}
          onPress={syncOfflineVisits}
        >
          <Text style={styles.offlineAlertText}>
            ⚠️ {offlineVisits.length} visit(s) pending sync. Tap to sync now.
          </Text>
        </TouchableOpacity>
      )}

      {/* Location Card */}
      <View style={styles.locationCard}>
        <Text style={styles.cardTitle}>📍 Current Location</Text>
        {location ? (
          <Text style={styles.locationText}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.locationText}>Getting location...</Text>
        )}
        <TouchableOpacity style={styles.refreshButton} onPress={getCurrentLocation}>
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsCard}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => { setScanMode('qr'); setCurrentView('scanner'); }}
          >
            <Text style={styles.quickActionIcon}>📷</Text>
            <Text style={styles.quickActionText}>Scan QR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={handleNFCScan}
          >
            <Text style={styles.quickActionIcon}>📱</Text>
            <Text style={styles.quickActionText}>Scan NFC</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => setCurrentView('visits')}
          >
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={styles.quickActionText}>My Visits</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Visits */}
      <View style={styles.recentVisitsCard}>
        <Text style={styles.cardTitle}>Recent Visits</Text>
        {visits.slice(0, 3).map((visit, index) => (
          <View key={visit.visitId || index} style={styles.recentVisitItem}>
            <Text style={styles.recentVisitPatient}>{visit.patientId}</Text>
            <Text style={styles.recentVisitTime}>
              {new Date(visit.timestamp).toLocaleDateString()}
            </Text>
            <View style={[
              styles.recentVisitStatus,
              { backgroundColor: visit.isVerified ? '#e8f5e9' : '#fff3e0' }
            ]}>
              <Text style={{ color: visit.isVerified ? '#4CAF50' : '#FF9800' }}>
                {visit.isVerified ? '✓ Verified' : '⏳ Pending'}
              </Text>
            </View>
          </View>
        ))}
        {visits.length === 0 && (
          <Text style={styles.emptyText}>No visits yet. Scan a patient to start.</Text>
        )}
      </View>
    </ScrollView>
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
          <Text style={styles.scannerMenuTitle}>Patient Verification</Text>
          <Text style={styles.scannerMenuSubtitle}>Choose scan method</Text>
          
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => { setScanMode('qr'); setIsScanning(true); }}
          >
            <Text style={styles.scanButtonIcon}>📷</Text>
            <View style={styles.scanButtonTextContainer}>
              <Text style={styles.scanButtonText}>Scan QR Code</Text>
              <Text style={styles.scanButtonSubtext}>Use camera to scan patient's QR</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: '#2196F3' }]}
            onPress={handleNFCScan}
          >
            <Text style={styles.scanButtonIcon}>📱</Text>
            <View style={styles.scanButtonTextContainer}>
              <Text style={styles.scanButtonText}>Tap NFC Tag</Text>
              <Text style={styles.scanButtonSubtext}>Hold device near NFC tag</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={generatePatientTag}
          >
            <Text style={styles.testButtonText}>🧪 Generate Test QR (Demo)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render visits list with better UI
  const renderVisits = () => (
    <View style={styles.visitsContainer}>
      <View style={styles.visitsHeader}>
        <Text style={styles.sectionTitle}>My Visits</Text>
        <TouchableOpacity onPress={loadVisits}>
          <Text style={styles.refreshLink}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>
      
      {/* Offline visits section */}
      {offlineVisits.length > 0 && (
        <View style={styles.offlineVisitsSection}>
          <Text style={styles.offlineVisitsTitle}>📤 Pending Sync ({offlineVisits.length})</Text>
          {offlineVisits.map((visit, index) => (
            <View key={visit.id} style={styles.offlineVisitCard}>
              <Text style={styles.offlineVisitPatient}>{visit.data.patientId}</Text>
              <Text style={styles.offlineVisitTime}>
                Saved: {new Date(visit.savedAt).toLocaleString()}
              </Text>
            </View>
          ))}
          <TouchableOpacity style={styles.syncButton} onPress={syncOfflineVisits}>
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={visits}
        keyExtractor={(item) => item.visitId || item._id}
        renderItem={({ item }) => (
          <View style={styles.visitCard}>
            <View style={styles.visitCardHeader}>
              <Text style={styles.visitPatient}>Patient: {item.patientId}</Text>
              <View style={[
                styles.visitStatusBadge,
                { backgroundColor: item.isVerified ? '#e8f5e9' : '#fff3e0' }
              ]}>
                <Text style={[
                  styles.visitStatus,
                  { color: item.isVerified ? '#4CAF50' : '#FF9800' }
                ]}>
                  {item.isVerified ? '✓ Verified' : '⏳ Pending'}
                </Text>
              </View>
            </View>
            <Text style={styles.visitTime}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
            <View style={styles.visitDetails}>
              <Text style={styles.visitDetailText}>
                📍 {item.location?.coordinates?.latitude?.toFixed(4) || 'N/A'}, 
                {item.location?.coordinates?.longitude?.toFixed(4) || 'N/A'}
              </Text>
              {item.visitType && (
                <Text style={styles.visitDetailText}>
                  📋 {item.visitType.replace(/_/g, ' ')}
                </Text>
              )}
            </View>
            {item.services && item.services.length > 0 && (
              <View style={styles.servicesRow}>
                {item.services.slice(0, 3).map((service, idx) => (
                  <View key={idx} style={styles.serviceTag}>
                    <Text style={styles.serviceTagText}>{service.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
                {item.services.length > 3 && (
                  <Text style={styles.moreServices}>+{item.services.length - 3} more</Text>
                )}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No visits recorded yet</Text>
            <Text style={styles.emptySubtext}>Scan a patient to log your first visit</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );

  // Render profile with more details
  const renderProfile = () => (
    <ScrollView style={styles.profileContainer}>
      <Text style={styles.sectionTitle}>Profile</Text>
      
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{chwName ? chwName[0].toUpperCase() : 'C'}</Text>
        </View>
        <Text style={styles.profileName}>{chwName || 'CHW User'}</Text>
        <Text style={styles.profileId}>ID: {chwId}</Text>
      </View>
      
      <View style={styles.profileStatsCard}>
        <View style={styles.profileStatItem}>
          <Text style={styles.profileStatNumber}>{visits.length}</Text>
          <Text style={styles.profileStatLabel}>Total Visits</Text>
        </View>
        <View style={styles.profileStatDivider} />
        <View style={styles.profileStatItem}>
          <Text style={styles.profileStatNumber}>
            {visits.filter(v => v.isVerified).length}
          </Text>
          <Text style={styles.profileStatLabel}>Verified</Text>
        </View>
        <View style={styles.profileStatDivider} />
        <View style={styles.profileStatItem}>
          <Text style={styles.profileStatNumber}>
            {visits.length > 0 ? Math.round((visits.filter(v => v.isVerified).length / visits.length) * 100) : 0}%
          </Text>
          <Text style={styles.profileStatLabel}>Rate</Text>
        </View>
      </View>
      
      <View style={styles.profileMenuCard}>
        <TouchableOpacity style={styles.profileMenuItem}>
          <Text style={styles.profileMenuIcon}>👤</Text>
          <Text style={styles.profileMenuText}>Edit Profile</Text>
          <Text style={styles.profileMenuArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.profileMenuItem}>
          <Text style={styles.profileMenuIcon}>🔐</Text>
          <Text style={styles.profileMenuText}>Change Password</Text>
          <Text style={styles.profileMenuArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.profileMenuItem}>
          <Text style={styles.profileMenuIcon}>📊</Text>
          <Text style={styles.profileMenuText}>My Statistics</Text>
          <Text style={styles.profileMenuArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.profileMenuItem}>
          <Text style={styles.profileMenuIcon}>⚙️</Text>
          <Text style={styles.profileMenuText}>Settings</Text>
          <Text style={styles.profileMenuArrow}>›</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>🚪 Logout</Text>
      </TouchableOpacity>
      
      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  );

  // Render visit modal for entering visit details
  const renderVisitModal = () => (
    <Modal
      visible={showVisitModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowVisitModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Log Visit</Text>
          
          {pendingVisit && (
            <>
              <View style={styles.modalPatientInfo}>
                <Text style={styles.modalPatientId}>Patient: {pendingVisit.patientId}</Text>
                <Text style={styles.modalPatientName}>{pendingVisit.patientName}</Text>
              </View>
              
              <Text style={styles.modalLabel}>Visit Type</Text>
              <View style={styles.visitTypeContainer}>
                {['routine_checkup', 'follow_up', 'emergency', 'vaccination'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.visitTypeButton,
                      visitType === type && styles.visitTypeButtonActive
                    ]}
                    onPress={() => setVisitType(type)}
                  >
                    <Text style={[
                      styles.visitTypeText,
                      visitType === type && styles.visitTypeTextActive
                    ]}>
                      {type.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.modalLabel}>Services Provided</Text>
              <View style={styles.servicesContainer}>
                {serviceOptions.map(service => (
                  <TouchableOpacity
                    key={service}
                    style={[
                      styles.serviceButton,
                      selectedServices.includes(service) && styles.serviceButtonActive
                    ]}
                    onPress={() => toggleService(service)}
                  >
                    <Text style={[
                      styles.serviceButtonText,
                      selectedServices.includes(service) && styles.serviceButtonTextActive
                    ]}>
                      {service.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.modalLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add any notes about the visit..."
                value={visitNotes}
                onChangeText={setVisitNotes}
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowVisitModal(false);
                    setPendingVisit(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalSubmitButton}
                  onPress={submitVisit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Submit Visit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
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
        {isAuthenticated && (
          <View style={[styles.onlineIndicator, { backgroundColor: isOnline ? '#4CAF50' : '#FF9800' }]} />
        )}
      </View>

      {!isAuthenticated ? (
        renderLogin()
      ) : (
        <View style={styles.mainContainer}>
          {renderNavigation()}
          <View style={styles.content}>
            {renderContent()}
          </View>
          {renderVisitModal()}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 10,
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
    borderBottomWidth: 2,
    borderBottomColor: '#1976D2',
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  dashboard: {
    padding: 16,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    marginRight: 8,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  offlineAlert: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  offlineAlertText: {
    color: '#e65100',
    fontSize: 13,
  },
  locationCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  refreshButtonText: {
    fontSize: 12,
  },
  quickActionsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 12,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
  },
  recentVisitsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  recentVisitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentVisitPatient: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  recentVisitTime: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  recentVisitStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scannerContainer: {
    flex: 1,
  },
  scannerMenu: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  scannerMenuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  scannerMenuSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  scanButton: {
    backgroundColor: '#1976D2',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  scanButtonTextContainer: {
    flex: 1,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  testButton: {
    backgroundColor: '#757575',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
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
    flex: 1,
    padding: 16,
  },
  visitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshLink: {
    color: '#1976D2',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  offlineVisitsSection: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  offlineVisitsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 8,
  },
  offlineVisitCard: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  offlineVisitPatient: {
    fontSize: 13,
    fontWeight: '500',
  },
  offlineVisitTime: {
    fontSize: 11,
    color: '#666',
  },
  syncButton: {
    backgroundColor: '#ff9800',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  visitCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  visitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  visitPatient: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  visitStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  visitTime: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  visitStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  visitDetails: {
    marginBottom: 8,
  },
  visitDetailText: {
    fontSize: 12,
    color: '#666',
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginTop: 4,
  },
  serviceTagText: {
    fontSize: 10,
    color: '#1976D2',
  },
  moreServices: {
    fontSize: 10,
    color: '#666',
    marginTop: 6,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 13,
    marginTop: 4,
  },
  profileContainer: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileId: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileStatsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    elevation: 2,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  profileMenuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileMenuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  profileMenuText: {
    flex: 1,
    fontSize: 16,
  },
  profileMenuArrow: {
    fontSize: 20,
    color: '#ccc',
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
  versionText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalPatientInfo: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalPatientId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalPatientName: {
    fontSize: 14,
    color: '#666',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  visitTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  visitTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
  },
  visitTypeButtonActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  visitTypeText: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
  },
  visitTypeTextActive: {
    color: 'white',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 6,
    marginBottom: 6,
  },
  serviceButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  serviceButtonText: {
    fontSize: 11,
    color: '#666',
    textTransform: 'capitalize',
  },
  serviceButtonTextActive: {
    color: 'white',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 2,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default App;
