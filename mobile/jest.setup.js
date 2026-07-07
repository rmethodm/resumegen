require('react-native-gesture-handler/jestSetup');

// Mock the SectionOrderSection component that uses DraggableFlatList
jest.mock(
  './screens/resume-edit/SectionOrderSection',
  () => {
    const React = require('react');
    const { View, Text, StyleSheet } = require('react-native');

    const mockStyles = StyleSheet.create({
      container: { marginVertical: 12 },
      sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    });

    return function MockSectionOrderSection({ sectionOrder, onSave }) {
      return (
        <View style={mockStyles.container}>
          <Text style={mockStyles.sectionTitle}>Section order (mocked)</Text>
          <Text>{sectionOrder ? sectionOrder.join(', ') : 'None'}</Text>
        </View>
      );
    };
  },
  { virtual: false },
);
