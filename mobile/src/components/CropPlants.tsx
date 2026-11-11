import { View, Text, StyleSheet } from 'react-native';
import type { CropType } from '../types';

const CROP_EMOJI: Record<string, string> = { maize: '🌽', wheat: '🌾', soybean: '🌱', sunflower: '🌻', vegetables: '🥬' };

export default function CropPlants({ crop }: { crop: CropType }) {
  if (crop === 'none' || !CROP_EMOJI[crop]) return null;
  const emoji = CROP_EMOJI[crop];
  return (
    <View style={s.wrap} pointerEvents="none">
      {Array.from({ length: 15 }).map((_, i) => (<Text key={i} style={s.plant}>{emoji}</Text>))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', opacity: 0.9, overflow: 'hidden' },
  plant: { fontSize: 10, lineHeight: 12, width: '20%', textAlign: 'center' },
});