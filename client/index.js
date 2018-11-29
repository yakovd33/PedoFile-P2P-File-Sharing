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
		// transparent: true, 
		// frame: false
		// Need to make the window round
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
			buffer = buffer.toString();
			if (buffer == 'incorrect') {
				mainWindow.webContents.send('incorrect', '');
			} else {
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

function signup (email, password) {
	try {
		var c = net.createConnection(8008, '127.0.0.1');
		c.on("connect", function() {
			// connected to TCP server.
			c.write("signup");
			c.write(email);
			c.write(password);
		});

		c.on("data", function (buffer) {
			buffer = buffer.toString();
			if (buffer != "success") {
				console.log(buffer);
				mainWindow.webContents.send('feedback', buffer);
			} else {
				login(email, password)
			}

			c.end();
		});
	} catch (e) {
		console.log(e);
	}

	return true;
}

// Form submissions
ipc.on('login_form_submit', function (event, data) {
	params = data_to_params(data);
	email = params.email;
	password = params.password;
	
	if (!login(email, password)) {
		// Unsuccessful login
	}
});

ipc.on('logout', function (event, data) {
	logout();
	mainWindow.loadFile('template/signin.html');
});

ipc.on('signup_form_submit', function (event, data) {
	params = data_to_params(data);
	email = params.email;
	password = params.password;
	
	if (!signup(email, password)) {
		// Unsuccessful signup
	}
});