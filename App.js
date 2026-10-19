import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import { MushafProvider, navigationRef, useMushaf } from "./src/MushafContext";
import HomeScreen from "./src/screens/HomeScreen";
import ReaderScreen from "./src/screens/ReaderScreen";
import DownloadsScreen from "./src/screens/DownloadsScreen";
import PlayerDock from "./src/components/PlayerDock";
import FatihaModal from "./src/components/FatihaModal";
import ReciterSheet from "./src/components/ReciterSheet";
import { colors } from "./src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync(colors.ink).catch(() => {});

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.ink,
    card: colors.ink,
    text: colors.goldSoft,
    border: colors.line,
    primary: colors.gold,
  },
};

class Guard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError() {
    return { error: true };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", padding: 28 }}>
          <Text style={{ color: colors.goldSoft, fontSize: 22, textAlign: "center" }}>
            تعذّر فتح المصحف. أغلق التطبيق وافتحه مرة أخرى.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function Shell() {
  const { noteRoute, night } = useMushaf();
  const syncRoute = () => noteRoute(navigationRef.getCurrentRoute());
  const canvas = night ? colors.ink : colors.parchment;

  return (
    <>
      <StatusBar style={night ? "light" : "dark"} />
      <NavigationContainer
        ref={navigationRef}
        theme={{ ...navTheme, colors: { ...navTheme.colors, background: canvas, card: canvas } }}
        onReady={syncRoute}
        onStateChange={syncRoute}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: "fade",
            gestureEnabled: false,
            contentStyle: { backgroundColor: canvas },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Reader" component={ReaderScreen} />
          <Stack.Screen name="Downloads" component={DownloadsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <PlayerDock />
      <FatihaModal />
      <ReciterSheet />
    </>
  );
}

export default function App() {
  const [loaded, error] = useFonts({
    AmiriQuran: require("./fonts/AmiriQuran-Regular.ttf"),
    Ruqaa: require("./fonts/ArefRuqaa-Regular.ttf"),
    RuqaaBold: require("./fonts/ArefRuqaa-Bold.ttf"),
    Tajawal: require("./fonts/Tajawal-Regular.ttf"),
    TajawalBold: require("./fonts/Tajawal-Bold.ttf"),
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <Guard>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MushafProvider>
          <Shell />
        </MushafProvider>
      </SafeAreaProvider>
      </GestureHandlerRootView>
    </Guard>
  );
}
