// PayslipScreen.js
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { BASE_URL } from './components/BaseUrlApi';
import { RootState } from './store/store';

const API_LIST = BASE_URL + 'getpayslip';
const API_VIEW = BASE_URL + 'publicpayslip';
const USER_AGENT = 'DashboardApp';

const PayslipScreen = () => {
  const [payslips, setPayslips] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileUri, setFileUri] = useState('');
  const { authToken } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchPayslipList();
  }, []);

  const fetchPayslipList = async () => {
  try {
    setLoading(true);
    const formData = new FormData();
    formData.append('token', authToken || '');

    const response = await axios.post(API_LIST, formData, {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json'
      },
    });

    console.log('Full API Response:', response.data.data); // Debug log

    // More flexible response handling
    if (response.data && (response.data.data || response.data.payslips)) {
      const payslipData = response.data.data || response.data.payslips || [];
      
      const validPayslips = payslipData.filter((item: any) => {
        // Check for either uuid or id, and month_payslip
        return (item.uuid || item.id) && item.month_payslip;
      });

      if (validPayslips.length === 0) {
        console.warn('No valid payslips found in response');
      }

      setPayslips(validPayslips);
    } else {
      throw new Error('Unexpected response structure');
    }
  } catch (error: any) {
    console.error('Payslip fetch error:', error);
    
    let errorMessage = 'Failed to load payslip list';
    if (error.response) {
      // Handle HTTP error statuses
      errorMessage = `Server error: ${error.response.status}`;
      console.error('Server response data:', error.response.data);
    } else if (error.request) {
      errorMessage = 'No response from server';
    }

    Alert.alert('Error', errorMessage);
  } finally {
    setLoading(false);
  }
};

  const fetchPayslipFile = async (uuid: any) => {
  try {
    setLoading(true);
    const formData = new FormData();
    formData.append('token', authToken || '');
    formData.append('uuid', uuid);

    const response = await axios.post(API_VIEW, formData, {
      headers: {
        'user-agent': USER_AGENT,
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'arraybuffer',
    });

    // Convert ArrayBuffer to Base64 without using Buffer
    const base64String = arrayBufferToBase64(response.data);
    const filePath = (FileSystem as any).documentDirectory + `payslip_${uuid}.pdf`;

    await (FileSystem as any).writeAsStringAsync(filePath, base64String, {
      encoding: (FileSystem as any).EncodingType.Base64,
    });

    setFileUri(filePath);
    setModalVisible(true);
  } catch (error) {
    console.error('PDF view error:', error);
    Alert.alert('Error', 'Unable to load payslip file. Please try again later.');
  } finally {
    setLoading(false);
  }
};

// Helper function to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: any) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

  const downloadPdf = async () => {
    if (!fileUri) {
      Alert.alert('Error', 'No file available to download');
      return;
    }
    
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Payslip',
        UTI: 'com.adobe.pdf'
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share/download PDF');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.month_payslip}</Text>
      <Text style={styles.cell}>{item.generated_at?.split(' ')[0]}</Text>
      <TouchableOpacity
        style={styles.viewBtn}
        onPress={() => fetchPayslipFile(item.uuid)}
        disabled={loading}
      >
        <Text style={{ color: 'white' }}>View</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Payslip List</Text>

      {loading && !payslips.length ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <>
          <View style={styles.tableHeader}>
            <Text style={styles.headerCell}>Month</Text>
            <Text style={styles.headerCell}>Generated Date</Text>
            <Text style={styles.headerCell}>View</Text>
          </View>

          <FlatList
            data={payslips}
            keyExtractor={(item) => item.uuid}
            renderItem={renderItem}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No payslips available</Text>
            }
          />
        </>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator size="large" color="blue" />
            ) : (
              <>
                <Text style={{ marginBottom: 10 }}>Payslip is ready to download.</Text>
                <TouchableOpacity 
                  style={styles.downloadBtn} 
                  onPress={downloadPdf}
                  disabled={loading}
                >
                  <Text style={{ color: 'white' }}>Download / Share PDF</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  tableHeader: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomColor: '#ccc' 
  },
  headerCell: { flex: 1, fontWeight: 'bold', textAlign: 'center' },
  row: { 
    flexDirection: 'row', 
    paddingVertical: 12, 
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
    alignItems: 'center'
  },
  cell: { flex: 1, textAlign: 'center' },
  viewBtn: {
    backgroundColor: '#007bff',
    padding: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'center'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    position: 'relative'
  },
  closeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
    padding: 4
  },
  downloadBtn: {
    marginTop: 20,
    backgroundColor: 'green',
    padding: 12,
    borderRadius: 6,
    minWidth: 200,
    alignItems: 'center'
  },
  loader: {
    marginTop: 40
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666'
  }
});

export default PayslipScreen;