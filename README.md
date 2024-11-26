# Project Title

This project fetches client data from an API, processes it, and writes the processed data to Google Sheets. It handles large datasets efficiently by splitting them into pages and using batching for status requests.

## Requirements

Before you can run the project, you need to set up the following:

### 1. Environment Variables

Make sure to set the following environment variables in your `.env` file or system environment:

```env
GOOGLE_APPLICATION_CREDENTIALS=./src/credentials.json
SHEET_ID=1cxIv0SE5EZlE3Lj6ZqLQFUw_Kat4Kcoh_Exh1GGgAds
API_BASE=http://94.103.91.4:5000
```

- `GOOGLE_APPLICATION_CREDENTIALS`: Path to your Google Cloud credentials JSON file.
- `SHEET_ID`: The ID of the Google Sheets document where data will be written.
- `API_BASE`: The base URL of the API to fetch client data.

### 2. Install Dependencies

Clone the repository and run the following command to install the required dependencies:

```bash
npm install
```

This will install the following dependencies:

- `axios`: HTTP client for making API requests.
- `chalk`: A library to style the console output.
- `dotenv`: A library to manage environment variables.
- `googleapis`: Google's official library for interacting with Google Sheets API.

### 3. Google Cloud Setup

If you don't already have Google Cloud credentials, follow these steps:

- Go to [Google Cloud Console](https://console.cloud.google.com/).
- Create a project and enable the Google Sheets API.
- Create a Service Account with `Editor` permissions.
- Download the `credentials.json` file for the Service Account and place it in the `src` folder of your project.

### 4. Google Sheets Setup

- Create a Google Sheet and copy its ID from the URL.
  For example, if the URL is `https://docs.google.com/spreadsheets/d/1cxIv0SE5EZlE3Lj6ZqLQFUw_Kat4Kcoh_Exh1GGgAds/edit`, the `SHEET_ID` is `1cxIv0SE5EZlE3Lj6ZqLQFUw_Kat4Kcoh_Exh1GGgAds`.
- Ensure the Service Account has access to the Google Sheet (share the sheet with the Service Account’s email).

### 5. Running the Project

Once the setup is complete, run the project with the following command:

```bash
npm run dev
```

This will start the script, which will:

1. Register/login a user.
2. Fetch clients in batches of 1000.
3. Process client statuses in batches of 100.
4. Write the processed data to Google Sheets in two separate pages (`Page1` and `Page2`).

## File Structure

```
- src/
  - index.js                 # Main script
  - credentials.json         # Google Cloud credentials (should not be committed to version control)
  - .env                     # Environment variables (should not be committed to version control)
- package.json               # Project dependencies and scripts
- README.md                  # This file
```

## Additional Notes

- The project fetches a total of 100,000 clients from the API, splitting them into two pages.
- Data is written to the Google Sheets document in two separate sheets named `Page1` and `Page2`.
- The script handles API errors and retries the login if registration fails.
