import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../api/supabase';
import { listEntries } from '../api/entries';
import { monthRange, formatDateKey } from '../lib/date';

// Not the real journal screen -- this exists only to prove the whole chain works:
// session token -> Authorization header -> Express -> Supabase -> back here.
export default function HomeScreen() {
  const [state, setState] = useState({ status: 'loading' });
  // the notch on iOS and the status/nav bars on Android
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;
    const { from, to } = monthRange(new Date());

    listEntries(from, to)
      .then((entries) => {
        if (!cancelled) setState({ status: 'ok', entries });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: err.message });
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.body}>
        <Text style={styles.title}>Connected</Text>

        {state.status === 'loading' && <ActivityIndicator />}

        {state.status === 'error' && (
          <Text style={styles.error}>API call failed: {state.message}</Text>
        )}

        {state.status === 'ok' && (
          <>
            <Text style={styles.ok}>
              Fetched {state.entries.length} entr
              {state.entries.length === 1 ? 'y' : 'ies'} for this month.
            </Text>
            {state.entries.slice(0, 5).map((e) => (
              <Text key={e.date} style={styles.row}>{formatDateKey(e.date)}</Text>
            ))}
          </>
        )}

        <Pressable style={styles.btn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.btnText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf9f7' },
  body: { flex: 1, padding: 24, gap: 10, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '600' },
  ok: { fontSize: 16, color: '#2c2a28' },
  row: { fontSize: 14, color: '#8a8580' },
  error: { fontSize: 15, color: '#c0392b' },
  btn: {
    marginTop: 24, borderWidth: 1, borderColor: '#e0dcd6', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff',
  },
  btnText: { fontSize: 15, color: '#2c2a28' },
});
