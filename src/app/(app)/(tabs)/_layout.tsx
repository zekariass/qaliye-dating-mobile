import { Tabs } from 'expo-router';

import AppTabBar from '@/components/layout/AppTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="likes" options={{ title: 'Likes' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
