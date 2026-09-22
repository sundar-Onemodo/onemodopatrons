import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const AdPopup = ({ visible, onClose } : any) => {

   const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<any>(null);
  const adImage = require('../../assets/images/adImg.png');

  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      // Start countdown timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [visible]);

  const handleLearnMore = () => {
    Linking.openURL('https://play.google.com/store/apps/details?id=com.shreedhar_t.modomines');
  };

  const handleClose = async () => {
    await AsyncStorage.setItem('adShown', 'true');
    onClose();
  };

  return (
      <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button at top-left corner */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          {/* Advertisement label and timer at top-right corner */}
          <View style={styles.adHeader}>
            <Text style={styles.adLabel}>Advertisement</Text>
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>
          
          {/* Full image display */}
          <Image
            source={adImage}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* Footer with CTA */}
          <View style={styles.footer}>
            <Text style={styles.adTitle}>Start building credit through debit today with Wealthgrow</Text>
            <TouchableOpacity 
              style={styles.learnMoreButton} 
              onPress={handleLearnMore}
            >
              <Text style={styles.learnMoreText}>Learn more</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AdPopup;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    height: height * 0.8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adHeader: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 10,
  },
  adLabel: {
    color: '#fff',
    fontSize: 12,
    marginRight: 8,
  },
  timerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#fff',
  },
  learnMoreButton: {
    backgroundColor: '#1DB954', // Green accent color
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  learnMoreText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
