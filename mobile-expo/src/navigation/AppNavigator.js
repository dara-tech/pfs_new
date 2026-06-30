import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import ProvinceSelectionScreen from '../screens/ProvinceSelectionScreen';
import SiteSelectionScreen from '../screens/SiteSelectionScreen';
import ClientQuestionnaireScreen from '../screens/ClientQuestionnaire/ClientQuestionnaireScreen';
import ProviderQuestionnaireScreen from '../screens/ProviderQuestionnaire/ProviderQuestionnaireScreen';
import ThankYouScreen from '../screens/ThankYouScreen';
import { appColors } from '../theme';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="QRScanner"
        screenOptions={{
          headerStyle: {
            backgroundColor: appColors.primary,
          },
          headerTintColor: appColors.white,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="QRScanner" 
          component={QRScannerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ProvinceSelection" 
          component={ProvinceSelectionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="SiteSelection" 
          component={SiteSelectionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ClientQuestionnaire" 
          component={ClientQuestionnaireScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ProviderQuestionnaire" 
          component={ProviderQuestionnaireScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ThankYou" 
          component={ThankYouScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
