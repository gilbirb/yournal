import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { supabase } from '../api/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSignIn() {
    setBusy(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // on success useSession swaps this screen out, so only failure needs handling
    if (error) {
      setErrorMsg(error.message);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>yournal</Text>
        <Text style={styles.tagline}>a line a day</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!busy}
        />

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          textContentType="password"
          editable={!busy}
          onSubmitEditing={handleSignIn}
          returnKeyType="go"
        />

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.btn, (busy || pressed) && styles.btnBusy]}
          onPress={handleSignIn}
          disabled={busy}
        >
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign in</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', backgroundColor: '#faf9f7', padding: 24 },
  card: { gap: 12 },
  title: { fontSize: 34, fontWeight: '600', textAlign: 'center' },
  tagline: { fontSize: 15, color: '#8a8580', textAlign: 'center', marginBottom: 20 },
  input: {
    borderWidth: 1, borderColor: '#e0dcd6', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff',
  },
  error: { color: '#c0392b', fontSize: 14 },
  btn: {
    backgroundColor: '#2c2a28', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 4, minHeight: 50, justifyContent: 'center',
  },
  btnBusy: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
