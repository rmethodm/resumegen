import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { useAuth } from '../navigation/AuthContext';
import { ApiError } from '../lib/api';

export default function LoginScreen({ navigation }: any) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await login(email, password);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Log in</Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <Button title={submitting ? 'Logging in…' : 'Log in'} onPress={submit} disabled={submitting} />
            <Button title="Need an account? Register" onPress={() => navigation.navigate('Register')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
    error: { color: 'red', marginBottom: 12 },
});
