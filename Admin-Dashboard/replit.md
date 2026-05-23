# Admin Suite

Mobile admin management app built with Expo (React Native) and JSX.

## Flow

1. **Splash** (`app/index.tsx`) — animated logo screen, routes by auth/tour state.
2. **Auth** (`app/(auth)/login.tsx`, `register.tsx`) — sign in or create an account with role selection (Admin / Manager / HR).
3. **Tour** (`app/tour.tsx`) — 4-slide horizontal pager introducing the product.
4. **Dashboard** (`app/(tabs)/`) — bottom-tab app with Home, People, Projects, Finance, Settings.

## Architecture

- **Persistence**: AsyncStorage only (no backend). Auth + tour completion persist via `context/AuthContext.tsx`. Currency choice persists via `context/SettingsContext.tsx`.
- **Currency**: Default is Nigerian Naira (₦). Admin can change to USD, EUR, GBP, KES, GHS, ZAR, INR, CAD, AUD via Settings → Workspace → Currency. All amounts re-render through `useCurrencyFmt()`.
- **Mock data**: `data/mockData.ts` — employees, clients, projects, transactions, notifications. `data/chartData.ts` — 7D/30D/12M income & expense series for the dashboard chart.
- **Theme**: `constants/colors.ts` — indigo/violet brand palette with success/warning/danger/accent tokens.
- **Components**: `components/Brand.tsx` (logo lockup), `PrimaryButton.tsx`, `StatCard.tsx`, `SectionHeader.tsx`, `FinancialChart.tsx` (animated SVG line chart with smooth bezier curves, drawing-in animation, pulsing live dots, gradient income area, and 7D/30D/12M range switcher).

## Artifacts

- `admin-suite` — Expo mobile app (port 25052). View on phone with Expo Go via the QR code in the workflow logs.

## Notes

- Tab bar uses `BlurView` on iOS for a liquid-glass effect.
- Splash, auth headers and dashboard hero use `LinearGradient`.
- All key actions trigger `expo-haptics` impact feedback on native.
