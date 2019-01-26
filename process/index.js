const { app, BrowserWindow } = require('electron');
let mainWindow;
const ipc = require('electron').ipcMain;
var net = require('net');
var util = require('util');
var os = require('os');
var fs = require('fs');
var path = require('path');
const { dialog } = require('electron');

let SERVER_IP = '127.0.0.1';
let SERVER_PORT = 8008;

// Local Storage
const Store = require('electron-store');
const store = new Store({
	cwd: app.getPath('userData') + '../electron-quick-start',
});

function createWindow() {
	mainWindow = new BrowserWindow({
		show: false
	});

	mainWindow.on('closed', function () {
		mainWindow = null
	});
}

app.on('ready', createWindow)

// Quit when all windows are closed.	
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit();
	}
})

app.on('activate', function () {
	if (mainWindow === null) {
		createWindow();
	}
});

// FUNCTIONS
function is_logged () {
	return (store.get('login_token') != '');
}

// UPDATE OWN FILES
