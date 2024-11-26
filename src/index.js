import 'dotenv/config';
import axios from 'axios';
import { google } from 'googleapis';
import chalk from 'chalk';

const { GOOGLE_APPLICATION_CREDENTIALS, SHEET_ID, API_BASE } = process.env;

const BATCH_SIZE = 100;
const CONCURRENCY_LIMIT = 5;
const CLIENTS_PER_PAGE = 50000;

async function registerUser(username) {
	try {
		const response = await axios.post(`${API_BASE}/auth/registration`, {
			username,
		});
		return response.data.token;
	} catch (error) {
		if (error.response && error.response.status === 400) {
			return await loginUser(username);
		} else {
			console.error(chalk.red('Error during registration:'), error.message);
			throw error;
		}
	}
}

async function loginUser(username) {
	try {
		const response = await axios.post(`${API_BASE}/auth/login`, { username });
		return response.data.token;
	} catch (error) {
		console.error(chalk.red('Error during login:'), error.message);
		throw error;
	}
}

async function getClients(token) {
	const clients = [];
	let offset = 0;
	const limit = 1000;

	while (clients.length < 100000) {
		try {
			console.log(
				chalk.blue(`Requesting clients, please wait... Offset: ${offset}`)
			);
			const response = await axios.get(`${API_BASE}/clients`, {
				headers: { Authorization: token, 'Content-Type': 'application/json' },
				params: { offset, limit },
			});

			if (response.status !== 200) {
				console.error(
					chalk.red('Error fetching clients:'),
					response.status,
					response.statusText
				);
				break;
			}

			clients.push(...response.data);
			offset += limit;
		} catch (error) {
			console.error(chalk.red('Error requesting clients:'), error.message);
			break;
		}
	}

	return clients;
}

async function getClientStatuses(token, userIds) {
	const batches = [];
	for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
		batches.push(userIds.slice(i, i + BATCH_SIZE));
	}

	const statuses = [];
	console.log(chalk.red(`Requesting statuses, please wait...`));

	for (let i = 0; i < batches.length; i += CONCURRENCY_LIMIT) {
		const currentBatch = batches.slice(i, i + CONCURRENCY_LIMIT);
		const batchPromises = currentBatch.map(batch =>
			axios.post(
				`${API_BASE}/clients`,
				{ userIds: batch },
				{
					headers: { Authorization: token, 'Content-Type': 'application/json' },
				}
			)
		);

		try {
			const results = await Promise.all(batchPromises);
			results.forEach(response => statuses.push(...response.data));
		} catch (error) {
			console.error(chalk.red('Error requesting statuses:'), error.message);
		}
	}

	return statuses;
}

async function writeToGoogleSheets(auth, data, sheetName) {
	try {
		const sheets = google.sheets({ version: 'v4', auth });

		const values = [
			[
				'id',
				'firstName',
				'lastName',
				'gender',
				'address',
				'city', // 50,000 clients per page
				'phone',
				'email',
				'status',
			],
			...data.map(client => [
				client.id,
				client.firstName,
				client.lastName,
				client.gender,
				client.address,
				client.city,
				client.phone,
				client.email,
				client.status,
			]),
		];

		await sheets.spreadsheets.values.update({
			spreadsheetId: SHEET_ID,
			range: `${sheetName}!A1`,
			valueInputOption: 'RAW',
			resource: { values },
		});

		console.log(
			chalk.green(
				`Data successfully written to Google Sheets (Sheet: ${sheetName})`
			)
		);
	} catch (error) {
		console.error(chalk.red('Error writing to Google Sheets:'), error.message);
		throw error;
	}
}

async function main() {
	try {
		const username = 'ggggg';
		const token = await registerUser(username);

		if (!token) {
			throw new Error('Failed to obtain token');
		}

		const clients = await getClients(token);

		if (!clients || clients.length === 0) {
			console.log('Failed to retrieve clients');
			return;
		}

		const firstPageClients = clients.slice(0, CLIENTS_PER_PAGE);
		const secondPageClients = clients.slice(
			CLIENTS_PER_PAGE,
			CLIENTS_PER_PAGE * 2
		);

		const firstPageUserIds = firstPageClients.map(client => client.id);
		const secondPageUserIds = secondPageClients.map(client => client.id);

		const firstPageStatuses = await getClientStatuses(token, firstPageUserIds);
		const secondPageStatuses = await getClientStatuses(
			token,
			secondPageUserIds
		);

		const firstPageData = firstPageClients.map(client => ({
			...client,
			status:
				firstPageStatuses.find(status => status.id === client.id)?.status ||
				'Unknown',
		}));

		const secondPageData = secondPageClients.map(client => ({
			...client,
			status:
				secondPageStatuses.find(status => status.id === client.id)?.status ||
				'Unknown',
		}));

		const auth = new google.auth.GoogleAuth({
			keyFile: GOOGLE_APPLICATION_CREDENTIALS,
			scopes: ['https://www.googleapis.com/auth/spreadsheets'],
		});

		await writeToGoogleSheets(auth, firstPageData, 'Page1');

		await writeToGoogleSheets(auth, secondPageData, 'Page2');
	} catch (error) {
		console.error(chalk.red('Error in process:'), error.message);
	}
}

main().catch(console.error);
