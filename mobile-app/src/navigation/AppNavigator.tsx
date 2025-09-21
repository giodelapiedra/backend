import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import RehabExercisesScreen from '../screens/RehabExercisesScreen';
import WeeklyReadinessScreen from '../screens/WeeklyReadinessScreen';
import IncidentReportScreen from '../screens/IncidentReportScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';

import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Exercises') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === 'Readiness') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          } else if (route.name === 'Report') {
            iconName = focused ? 'warning' : 'warning-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Exercises" component={RehabExercisesScreen} />
      <Tab.Screen name="Readiness" component={WeeklyReadinessScreen} />
      <Tab.Screen name="Report" component={IncidentReportScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // or a loading screen
  }

  return (
    <Stack.Navigator>
      {user ? (
        <Stack.Screen 
          name="Main" 
          component={MainTabs} 
          options={{ headerShown: false }} 
        />
      ) : (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
