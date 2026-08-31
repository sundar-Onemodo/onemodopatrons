import { RootState } from '@/src/store/store';
import { Entypo, Feather, Foundation, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
    Animated,
    Easing,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSelector } from 'react-redux';

export default function Profile() {
    const { phNumber, emailId, username, signupCountry } = useSelector((state: RootState) => state.auth);
    const spinValue = new Animated.Value(0);

    // Animation for the refresh button
    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const startSpin = () => {
        spinValue.setValue(0);
        Animated.timing(spinValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true
        }).start();
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#0F3460', '#1E88E5']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity onPress={startSpin}>
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Feather name="refresh-ccw" size={20} color="#fff" />
                    </Animated.View>
                </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.scrollContainer}>
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={require('../../assets/images/profile_img.jpg')}
                            style={styles.avatar}
                        />
                        <View style={styles.avatarBadge}>
                            <Ionicons name="camera" size={12} color="#fff" />
                        </View>
                    </View>
                    <Text style={styles.username}>{username}</Text>
                    <Text style={styles.userTitle}>Senior Developer</Text>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Personal Information</Text>
                        <TouchableOpacity style={styles.editButton}>
                            <MaterialIcons name="edit" size={18} color="#0F3460" />
                            <Text style={styles.editText}>Edit</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={styles.infoItem}>
                            <View style={styles.infoIconContainer}>
                                <Ionicons name="id-card" size={18} color="#0F3460" />
                            </View>
                            <Text style={styles.infoLabel}>Employee ID</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{emailId}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoItem}>
                            <View style={styles.infoIconContainer}>
                                <Ionicons name="person" size={18} color="#0F3460" />
                            </View>
                            <Text style={styles.infoLabel}>Username</Text>
                            <Text style={styles.infoValue}>{username}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoItem}>
                            <View style={styles.infoIconContainer}>
                                <Ionicons name="call" size={18} color="#0F3460" />
                            </View>
                            <Text style={styles.infoLabel}>Phone</Text>
                            <Text style={styles.infoValue}>+91 {phNumber}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoItem}>
                            <View style={{flexDirection:'row',width:'100%',alignItems:'center',justifyContent:"space-between"}}>
                            <View style={{width:'40%', flexDirection:'row',alignItems:"center"}}>
                            <View style={styles.infoIconContainer}>
                                <Ionicons name="location" size={18} color="#0F3460" />
                            </View>
                            <Text style={styles.infoLabel}>Location</Text>
                            </View>
                            <View style={{width:'60%',}}>
                            <Text style={[styles.infoValue]} ellipsizeMode='tail' numberOfLines={1}>{signupCountry}</Text>
                            </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section1}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Activity</Text>
                    </View>

                    <View style={styles.infoCard}>
                        <TouchableOpacity 
                            style={styles.activityItem}
                            onPress={() => router.push('/showattendancescreen')}
                        >
                            <View style={styles.activityIcon}>
                                <Ionicons name="calendar" size={20} color="#0F3460" />
                            </View>
                            <Text style={styles.activityText}>Your Attendance</Text>
                            <Entypo name="chevron-right" size={20} color="#999" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity 
                            style={styles.activityItem}
                            onPress={() => router.push('/showadpopup')}
                        >
                            <View style={styles.activityIcon}>
                                <Foundation name="clipboard-notes" size={20} color="#0F3460" />
                            </View>
                            <Text style={styles.activityText}>PaySlip</Text>
                            <Entypo name="chevron-right" size={20} color="#999" />
                        </TouchableOpacity>


                        <View style={styles.divider} />

                        <TouchableOpacity 
                            style={styles.activityItem}
                            onPress={() => router.push('/showvehiclescanner')}
                        >
                            <View style={styles.activityIcon}>
                                <Foundation name="clipboard-notes" size={20} color="#0F3460" />
                            </View>
                            <Text style={styles.activityText}>Vehicle Scanner</Text>
                            <Entypo name="chevron-right" size={20} color="#999" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.activityItem}>
                            <View style={[styles.activityIcon, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                                <Ionicons name="log-out" size={20} color="#F44336" />
                            </View>
                            <Text style={[styles.activityText, { color: '#F44336' }]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
        // paddingBottom:80,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        elevation: 4,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    scrollContainer: {
        flex: 1,
        paddingHorizontal: 15,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#fff',
        backgroundColor: '#e0e0e0',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#0F3460',
        width: 25,
        height: 25,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    username: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    userTitle: {
        fontSize: 14,
        color: '#666',
    },
    section: {
        marginBottom: 30,
    },
     section1: {
        marginBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editText: {
        fontSize: 14,
        color: '#0F3460',
        fontWeight: '600',
        marginLeft: 5,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    infoIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(15, 52, 96, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoLabel: {
        flex: 1,
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    infoValue: {
        flex: 2,
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
        textAlign: 'right',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 5,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    activityIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(15, 52, 96, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
});