import SplashScreen from '@/screens/splash/SplashScreen';

// SplashScreen always runs on app open.
// It handles its own session check and navigation after the animation completes.
export default function Index() {
  return <SplashScreen />;
}
