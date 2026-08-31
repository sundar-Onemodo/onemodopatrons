import React, { useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Video from 'react-native-video';

const cameraData = [
  {
    label: 'Camera 1',
    url: 'https://f214-2401-4900-1cc8-ea61-94ec-518d-6b71-3248.ngrok-free.app/camera1/index.m3u8', // Must be a valid video URL
  },
  {
    label: 'Camera 2',
    url: 'https://f214-2401-4900-1cc8-ea61-94ec-518d-6b71-3248.ngrok-free.app/camera2/index.m3u8', // Must be a valid video URL
  },
];

export default function App() {
  const [selectedCamera, setSelectedCamera] = useState(null);

  const handleBack = () => {
    setSelectedCamera(null); // Go back to camera list
  };

  return (
    <SafeAreaView style={styles.container}>
      {selectedCamera ? (
        <>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Video
            source={{
              uri: selectedCamera.url,
              headers: {
                'ngrok-skip-browser-warning': 'true',
                'Cache-Control': 'no-cache',
              },
            }}
            style={styles.video}
            controls
            resizeMode="contain"
            paused={false}
            onError={(e) => console.log('Video Error:', e)}
          />
        </>
      ) : (
        <View style={styles.cameraList}>
          {cameraData.map((cam, index) => (
            <TouchableOpacity
              key={index}
              style={styles.cameraBox}
              onPress={() => setSelectedCamera(cam)}
            >
              <Text style={styles.cameraLabel}>{cam.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraList: {
    flex: 1,
    flexDirection: 'column',
  },
  cameraBox: {
    flex: 1,
    backgroundColor: '#1f1f1f',
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  cameraLabel: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  backButton: {
    padding: 10,
    backgroundColor: '#111',
    marginTop:40
  },
  backText: {
    color: '#00aaff',
    fontSize: 16,
  },
  video: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 50,
    backgroundColor: 'black',
  },
});
