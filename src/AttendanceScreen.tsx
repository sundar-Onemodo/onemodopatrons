import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSelector } from 'react-redux';
import { BASE_URL } from './components/BaseUrlApi';
import { RootState } from './store/store';

const API_URL = BASE_URL + 'attendancelist';

export default function AttendanceScreen() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const { authToken, employeeId, companyId } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('token', authToken);
      formData.append('employee_id', employeeId);
      formData.append('company_id', companyId);

      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'User-Agent': 'DashboardApp',
        },
      });

      if (response.data?.status === 'success') {
        const sortedData = response.data.data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setSessions(sortedData);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('❌ Fetch attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (timeString === '0000-00-00 00:00:00') return '--';
    try {
      const timePart = timeString.split(' ')[1];
      const [hours, minutes] = timePart.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return timeString;
    }
  };

  const renderItem = ({ item }) => {
    const isPresent = item.present_status?.toLowerCase() === 'present';
    const backgroundColor = isPresent ? '#E8F5E9' : '#FFEBEE';
    const borderColor = isPresent ? '#C8E6C9' : '#FFCDD2';
    const iconColor = isPresent ? '#4CAF50' : '#F44336';
    const iconName = isPresent ? 'checkmark-circle' : 'close-circle';

    return (
      <View style={[styles.card, { backgroundColor, borderColor }]}>
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar" size={16} color="#555" />
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          </View>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>
              {formatTime(item.check_in)} - {formatTime(item.check_out)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Working Hours:</Text>
            <Text style={[styles.detailValue, { fontSize: 17, fontWeight: 'bold' }]}>
              {item.worked_hours}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Over Time:</Text>
            <Text style={styles.detailValue}>{item.additional_hours}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={50} color="#999" />
      <Text style={styles.emptyText}>No attendance records found</Text>
    </View>
  );

  // Convert attendance to calendar markings
  const getMarkedDates = () => {
    const marks = {};
    sessions.forEach((item) => {
      const date = item.date;
      const isPresent = item.present_status?.toLowerCase() === 'present';
      marks[date] = {
        customStyles: {
          container: {
            backgroundColor: isPresent ? '#C8E6C9' : '#FFCDD2',
            borderRadius: 20,
          },
          text: {
            color: isPresent ? '#2e7d32' : '#c62828',
            fontWeight: 'bold',
          },
        },
      };
    });
    return marks;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)}>
          <Ionicons name="calendar-outline" size={24} color="#0F3460" />
        </TouchableOpacity>
        <Text style={styles.title}>Attendance History</Text>
        <TouchableOpacity onPress={fetchAttendance}>
          <Ionicons name="refresh" size={22} color="#0F3460" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0F3460" style={styles.loader} />
      ) : showCalendar ? (
        <>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.circle, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.circle, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
          </View>

          <Calendar
            markingType={'custom'}
            markedDates={getMarkedDates()}
            theme={{
              todayTextColor: '#0F3460',
              textDayFontWeight: 'bold',
              textMonthFontWeight: 'bold',
            }}
          />
        </>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    padding: 15,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F3460',
  },
  loader: {
    marginTop: 50,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  detailsContainer: {
    marginTop: 5,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  circle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#444',
  },
});
