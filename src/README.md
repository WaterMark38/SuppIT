# WaterMark Reminder v8 - PDF and Email

Replace `src/App.jsx` and `src/App.css` with the included files.

Install the required PDF packages from the project folder:

```powershell
npm install jspdf html2canvas
```

Then restart the project:

```powershell
npm run dev
```

The document preview now includes:

- Print / Save PDF
- Save PDF & Open Email
- Open email only

The PDF is downloaded first. The default email app then opens with the recipient, subject, and message prepared. Browsers cannot automatically attach the downloaded PDF to a `mailto:` message, so the user must attach the downloaded file manually.
