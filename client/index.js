const { app, BrowserWindow } = require('electron');
let mainWindow;
const ipc = require('electron').ipcMain;

// Local Storage
const Store = require('electron-store');
const store = new Store();

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1050,
		height: 650,
		center: true,
		minWidth: 1050,
		minHeight: 650,
		autoHideMenuBar: true,
	});

	if (is_logged()) {
		mainWindow.loadFile('template/index.html');
	} else {
		mainWindow.loadFile('template/signin.html');
		mainWindow.context = {
			test: 'hehehe'	
		};
	}

	mainWindow.on('closed', function () {
		mainWindow = null
	});
}

app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', function () {
	if (mainWindow === null) {
		createWindow();
	}
});

// Functions
function login () {
	// store.set('login_token', 'hehehe');
}

function is_logged () {
	return (store.get('login_token') != '');
}

function logout () {
	store.set('login_token', '');
}