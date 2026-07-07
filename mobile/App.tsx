import React from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './navigation/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ResumeListScreen from './screens/ResumeListScreen';
import ResumeDetailScreen from './screens/ResumeDetailScreen';
import ActivityScreen from './screens/ActivityScreen';
import ResumeEditScreen from './screens/ResumeEditScreen';
import CoverLetterListScreen from './screens/CoverLetterListScreen';
import CoverLetterEditScreen from './screens/CoverLetterEditScreen';
import ResignationLetterListScreen from './screens/ResignationLetterListScreen';
import ResignationLetterEditScreen from './screens/ResignationLetterEditScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
    const { user, loading } = useAuth();

    const navigationRef = useRef<NavigationContainerRef<any>>(null);

    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            const threadId = response.notification.request.content.data?.thread_id;
            if (threadId) {
                navigationRef.current?.navigate('Activity', { threadId });
            }
        });

        return () => subscription.remove();
    }, []);

    if (loading) {
        return null;
    }

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator>
                {user ? (
                    <>
                        <Stack.Screen name="Resumes" component={ResumeListScreen} />
                        <Stack.Screen name="ResumeDetail" component={ResumeDetailScreen} options={{ title: 'Resume' }} />
                        <Stack.Screen name="ResumeEdit" component={ResumeEditScreen} options={{ title: 'Edit Resume' }} />
                        <Stack.Screen name="CoverLetters" component={CoverLetterListScreen} options={{ title: 'Cover Letters' }} />
                        <Stack.Screen name="CoverLetterEdit" component={CoverLetterEditScreen} options={{ title: 'Edit Cover Letter' }} />
                        <Stack.Screen name="ResignationLetters" component={ResignationLetterListScreen} options={{ title: 'Resignation Letters' }} />
                        <Stack.Screen name="ResignationLetterEdit" component={ResignationLetterEditScreen} options={{ title: 'Edit Resignation Letter' }} />
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
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <RootNavigator />
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
