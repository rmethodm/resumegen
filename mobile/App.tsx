import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './navigation/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ResumeListScreen from './screens/ResumeListScreen';
import ResumeDetailScreen from './screens/ResumeDetailScreen';
import ActivityScreen from './screens/ActivityScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return null;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator>
                {user ? (
                    <>
                        <Stack.Screen name="Resumes" component={ResumeListScreen} />
                        <Stack.Screen name="ResumeDetail" component={ResumeDetailScreen} options={{ title: 'Resume' }} />
                        <Stack.Screen name="Activity" component={ActivityScreen} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <RootNavigator />
        </AuthProvider>
    );
}
