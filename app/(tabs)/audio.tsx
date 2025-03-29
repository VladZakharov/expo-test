import React, {useEffect, useState} from 'react';
import { View, StyleSheet, Button, Text } from 'react-native';
import {Audio, AVPlaybackStatus} from 'expo-av';
import Animated, {useAnimatedStyle, useSharedValue, withSpring, withTiming} from "react-native-reanimated";

const TILE_SIZE = 20;
const UPDATE_INTERVAL = 500

export default function AudioScreen() {
  const [recording, setRecording] = useState<Audio.Recording>();
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const [audioUri, setAudioUri] = useState<string>();
  const [sound, setSound] = useState<Audio.Sound>();
  const [soundStatus, setSoundStatus] = useState<AVPlaybackStatus>();

  const soundPositionPercent = useSharedValue(0)

  async function playSound() {
    if (!sound) {
      return
    }
    console.log('Playing Sound');
    await sound.playAsync();
  }

  useEffect(() => {
    if (audioUri) {
      console.log('Loading Sound');
      Audio.Sound.createAsync({ uri: audioUri }, {}, setSoundStatus)
        .then(({ sound }) => setSound(sound))
    }
    // sound.getStatusAsync().then(status => console.log(status));
  }, [audioUri]);

  useEffect(() => {
    if (sound) {
      sound.setProgressUpdateIntervalAsync(UPDATE_INTERVAL)
      sound.setOnPlaybackStatusUpdate(setSoundStatus)
      return () => sound.setOnPlaybackStatusUpdate(null)
    }
  }, [sound]);

  useEffect(() => {
    if (soundStatus?.isLoaded) {
      const percent = Math.min(Math.round((soundStatus.positionMillis) / (soundStatus.durationMillis ?? soundStatus.positionMillis) * 100), 100)
      soundPositionPercent.value = withTiming(percent, { duration: UPDATE_INTERVAL })
    }

  }, [soundStatus?.isLoaded && soundStatus.positionMillis]);

  const audioLineStyle = useAnimatedStyle(() => ({
    width: `${soundPositionPercent.value}%`
  }))

  // useEffect(() => {
  //   return sound
  //     ? () => {
  //       console.log('Unloading Sound');
  //       sound.unloadAsync();
  //     }
  //     : undefined;
  // }, [sound]);

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    setRecording(undefined);
    await recording?.stopAndUnloadAsync();
    await Audio.setAudioModeAsync(
      {
        allowsRecordingIOS: false,
      }
    );
    const uri = recording?.getURI();
    setAudioUri(uri ?? undefined)
    console.log('Recording stopped and stored at', uri);
  }

  return (
    <View style={styles.container}>
      <Button
        title={recording ? 'Stop Recording' : 'Start Recording'}
        onPress={recording ? stopRecording : startRecording}
      />

      {!!sound && <Button title="Play Sound" onPress={playSound} />}

      <View style={[styles.audioLineContainer, { marginTop: 16 }]}>
        <Animated.View style={[styles.audioLine, audioLineStyle]}>
          <View style={styles.audioLineTile}/>
        </Animated.View>
      </View>
      {soundStatus?.isLoaded && (
        <View style={{ marginTop: 8 }}>
          <Text>{`${soundStatus.positionMillis} / ${soundStatus.durationMillis} ms`}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
    padding: 10,
  },
  audioLineContainer: {
    height: 4,
    width: '90%',
    borderRadius: 2,
    backgroundColor: '#b6d3da',
    alignSelf: 'center',
  },
  audioLine: {
    height: '100%',
    // width: '70%',
    borderRadius: 2,
    backgroundColor: '#5fa5b6',
  },
  audioLineTile: {
    height: TILE_SIZE,
    aspectRatio: 1,
    borderRadius: TILE_SIZE / 2,
    backgroundColor: 'rgba(49,115,131,0.5)',
    alignSelf: 'flex-end',
    top: -(TILE_SIZE - 4) / 2,
    right: -TILE_SIZE / 2,
  }
});
