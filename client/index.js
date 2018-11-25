const { app, BrowserWindow } = require('electron');
let mainWindow;
const ipc = require('electron').ipcMain;
var net = require('net');
var util = require('util');

// Local Storage
const Store = require('electron-store');
const store = new Store();

function dashboard () {
	mainWindow.loadFile('template/index.html');
}

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
		console.log("dashboard1");
		dashboard();
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
		app.quit();
	}
})

app.on('activate', function () {
	if (mainWindow === null) {
		createWindow();
	}
});

// Functions
function login (email, password) {
	try {
		var c = net.createConnection(8008, '127.0.0.1');
		c.on("connect", function() {
			// connected to TCP server.
			c.write("login");
			c.write(email);
			c.write(password);
		});

		c.on("data", function (buffer) {
			if (buffer == 'incorrect') {
				mainWindow.webContents.send('incorrect', '');
			} else {
				console.log("dashboard2");
				dashboard();
				store.set('login_token', buffer);
				
			}

			c.end();
		});
	} catch (e) {
		console.log(e);
	}

	return true;
}

function is_logged () {
	console.log("checking logged!");
	console.log(store.get('login_token'));
	if(store.get('login_token') == ('logout' || 'NULL')) {
		return false;
		console.log("not logged");
	}
	else {
		console.log("logged");
		return true;
	}
	//return (store.get('login_token') != '');
}

function logout () {
	store.set('login_token', 'logout');
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
	
	if (login(email, password)) {
		// Successful login
		login(email, password);
	}
});

ipc.on('logout', function (event, data) {
	logout();
	mainWindow.loadFile('template/signin.html');
});