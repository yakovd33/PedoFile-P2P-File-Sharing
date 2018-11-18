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
function validate_login (email, password) {
	return true;
}

function login (email, password) {
	// store.set('login_token', 'hehehe');
	return true;
}

function is_logged () {
	return (store.get('login_token') != '');
}

function logout () {
	store.set('login_token', '');
}

function data_to_params (data) {
	var params = data.split('&');
	var res = [];

    for (var i in params) {
        var tmp= params[i].split('=');
        var key = tmp[0], value = tmp[1];
        res[key] = value;
	}
	
	return res;
}

// Form submissions
ipc.on('login_form_submit', function (event, data) {
	params = data_to_params(data);
	email = params.email;
	password = params.password;

	if (validate_login(email, password)) {
		if (login(email, password)) {
			// Successful login
		} else {
			// Password does not exists
		}
	}
})