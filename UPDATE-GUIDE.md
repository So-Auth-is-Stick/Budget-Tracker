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
| `assets/ledger/` (new app icon + splash) | `BudgetTracker/assets/ledger/` |
| `.github/workflows/*.yml` | `BudgetTracker/.github/workflows/` |

Don't replace `app.json` or `eas.json`. Those hold your app's identity (step 3 updates app.json for you).

## 3. Run these three commands
Open a terminal in the `BudgetTracker` folder:

```
node scripts/update-app-json.js
npm install
npx expo start -c
```

* The first adds the notification / fingerprint / splash settings and the new icon to your `app.json`. It prints your
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

## What's new
**Everyday**
* Amounts show as ₱58,530.00 (with commas) everywhere.
* Balance: greeting, this-week bar chart (tap a day to see it), logging streak 🔥, and an eye button that hides amounts in public.
* Add sheet: *Quick add* buttons for things you log often, tags sorted by use, description suggestions, Today/Yesterday buttons, and a live "₱120 left for Food today" hint.
* After saving, you get a message with **Undo**, and a warning if the entry pushed a tag over its limit.
* Entry details: edit the **date** too, and **Log again today**.
* Tags: rename, change icon (emoji picker) and colour; deleting a tag moves its entries to another tag instead of orphaning them.

**Seeing your money**
* Calendar is now a heat map: every day shows what you spent, darker = heavier. Swipe between months; totals follow the month you're looking at. Add an entry to any past day from its day sheet.
* **Insights** (Budget → Insights): earned/spent/kept, plain-English observations, day-by-day chart with month-end projection, where it went vs last month, your heaviest weekday, biggest expenses, money in, and **badges**.
* A month recap card on Balance for the first week of each month.
* Budget: "₱X left, about ₱Y a day" for the rest of the month, and *Use as limits* suggestions from what you usually spend.

**Plans & recurring**
* Plans get their own icon and colour, a "set aside ₱X a day to make it" hint, +₱100/+₱500/+₱1,000 buttons and a little celebration when fully funded.
* Recurring entries can repeat **twice a month** (15th + last day, like a semi-monthly payroll).

**Safety**
* **Backup / restore** to a file (Drive, Gmail…), with undo for a restore, plus a reminder if you've never backed up. **Export to spreadsheet (.csv)**.
* **Reminders**: plans due (day before + on the day), recurring entries, optional evening "log today?" nudge.
* **Fingerprint unlock**, "Forgot PIN?" via fingerprint, wrong-PIN shake with a 30-second lockout after 5 tries, and auto-lock after 2 minutes in the background.
* New app icon and splash screen.
