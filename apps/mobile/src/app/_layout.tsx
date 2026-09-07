import { PortalHost } from "@rn-primitives/portal";
import * as SplashScreen from "expo-splash-screen";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";

import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <>
      <AnimatedSplashOverlay />
      <AppTabs />
      <PortalHost />
    </>
  );
}
