# Budget Tracker V2

A personal, PIN-protected budgeting app built with React Native and Expo. All data stays on your device — nothing is sent to a server.

## Features

- **PIN lock** — 4-digit PIN set on first launch, required every time the app opens. Stored securely on-device with `expo-secure-store`.
- **Balance tracking** — log income and expenses, see your running balance, today's spending, and a "safe to spend" number that accounts for money set aside in savings.
- **Custom tags** — fully editable categories for both income and expenses, each with its own emoji and color.
- **Calendar view** — a month grid with color-coded dots for income, spending, and budget warnings. Tap any date to see what happened that day, including upcoming goal due dates.
- **Spending limits** — set daily and/or monthly limits per tag, with progress bars and over-limit warnings.
- **Savings & Planner** — savings goals with optional due dates, add/withdraw funds, plus recurring transactions (rent, subscriptions, etc.) that auto-generate on schedule.
- **Search & filter** — find past transactions by description or tag, on both the Balance and Calendar screens.
- **Themes** — six color themes plus an Auto mode that follows your phone's light/dark setting.
- **Edit & delete** — every transaction and goal can be edited or removed after the fact, with confirmation before deleting.

## Tech stack

- [Expo](https://expo.dev) (React Native)
- `expo-secure-store` — encrypted PIN storage
- `@react-native-async-storage/async-storage` — local data storage
- `react-native-calendars` — calendar UI
- `react-native-safe-area-context` — safe-area-aware layouts

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) (LTS version)
- The [Expo Go](https://expo.dev/go) app on your phone, for development

### Installation

```bash
git clone https://github.com/yourusername/ledger.git
cd ledger
npm install
npx expo start
```

Scan the QR code that appears with Expo Go (Android) or your Camera app (iOS) to run it on your phone.

## Building a standalone app

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) to produce installable apps outside of Expo Go.

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview   # installable .apk
eas build --platform ios --profile preview        # requires a paid Apple Developer account to install on a physical iPhone
```

## Project structure

```
Ledger/
  App.js                  # Entry point, tab navigation, theme + data loading
  components/
    PinScreen.js           # PIN setup / unlock
    FeedScreen.js           # Balance screen
    CalendarScreen.js       # Calendar screen
    BudgetScreen.js          # Spending limits screen
    PlannerScreen.js         # Savings goals + recurring transactions
    SettingsModal.js         # Theme picker, Change PIN
    ChangePinModal.js
    CategoryManager.js       # Tag CRUD
    ColorPicker.js
    TransactionRow.js
    TransactionDetailModal.js
    GoalDetailModal.js
    RecurringManager.js
    DatePickerModal.js
    theme.js                 # Theme definitions + context
    storage.js                # Transaction persistence
    categories.js             # Category persistence
    goals.js                  # Savings goal persistence
    recurring.js                # Recurring rule persistence
    recurringEngine.js           # Recurring rule processing logic
    dateUtils.js                  # Date helpers
```

## Data & privacy

All data (transactions, tags, budgets, goals, recurring rules) is stored locally on-device using AsyncStorage. The PIN is stored separately in encrypted secure storage. Nothing leaves the device — there is no backend, account system, or analytics.

## License

MIT License.
