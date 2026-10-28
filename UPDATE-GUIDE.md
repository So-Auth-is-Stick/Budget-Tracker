# Ledger update: how to install it

Your data stays safe. This update only replaces code files. Everything you've logged lives on your
phone, not in these files, so as long as you install the new APK *over* the old app (don't uninstall)
it all carries over.

## 1. Back up the project folder first
Copy your whole `BudgetTracker` folder somewhere (e.g. `BudgetTracker-old`). If anything goes wrong you can
put it back.

## 2. Copy the new files in
From this zip, copy into your `BudgetTracker` folder and **replace** when asked:

| From the zip | Goes to |
|---|---|
| `App.js` | `BudgetTracker/App.js` |
| everything in `components/` | `BudgetTracker/components/` |
| `package.json` | `BudgetTracker/package.json` |
| `scripts/update-app-json.js` | `BudgetTracker/scripts/` (new folder) |
| `.github/workflows/*.yml` | `BudgetTracker/.github/workflows/` |

Don't replace `app.json` or `eas.json`. Those hold your app's identity (step 3 updates app.json for you).

## 3. Run these three commands
Open a terminal in the `BudgetTracker` folder:

```
node scripts/update-app-json.js
npm install
npx expo start -c
```

* The first adds the notification / fingerprint settings to your `app.json`. It prints your
  `android.package`. That must be the same as before, so the APK installs as an update.
* The second downloads the new libraries (icons, vibration, notifications, fingerprint, backup).
* The third lets you try it in Expo Go first.

## 4. Build the APK
Same as before: `eas build --platform android --profile preview`, or GitHub → Actions → **Build Android APK** → Run workflow.
Install the APK **over** the old app. Don't uninstall first.

After installing, open **Settings (gear on Balance) → Back up now** and save the file to Google Drive.
From then on your data is safe even if the phone is lost.

## Testing in Expo Go: what won't work there
* **Fingerprint unlock** works in Expo Go, but Face ID on iPhone only works in a real build.
* **Notifications**: Expo Go on Android shows local reminders, but the real test is the installed APK.
