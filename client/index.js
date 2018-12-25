const { app, BrowserWindow } = require('electron');
let mainWindow;
const ipc = require('electron').ipcMain;
var net = require('net');
var util = require('util');
var os = require('os');
let externalip = require('externalip');
var fs = require('fs');
var path = require('path');
const { dialog } = require('electron')

// file_listen();

let SERVER_IP = '127.0.0.1';
let SERVER_PORT = 8008;

// Local Storage
const Store = require('electron-store');
const store = new Store();

function dashboard () {
	mainWindow.loadFile('template/index.html');

	ipc.on('did-finish-load', function () {
		update_files_list();
		update_devices_list();
	
		// setTimeout(function () {
		// 	if (is_device_registered()) {
		// 		update_device_ip();
		// 		setInterval(update_device_ip, 30000); // Update ip every 30 seconds
		// 	}
		// }, 200);
	});
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1165,
		height: 650,
		center: true,
		minWidth: 1050,
		minHeight: 650,
		autoHideMenuBar: true,
		// transparent: true, 
		// frame: false,
		icon: 'icon.png'
		// Need to make the window round
	});

	if (is_logged()) {
		dashboard();
	} else {
		mainWindow.loadFile('template/signin.html');
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
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
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
				// Login successful
				store.set('login_token', buffer);
				if (!is_device_registered()) {
					register_device();
				}
				dashboard();
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

// store.set('device_id', '');
// store.set('login_token', '');
function is_device_registered () {
	return (store.get('device_id') != '' && store.get('device_id') != undefined);
}

function register_device () {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("signup_device");
			c.write(store.get('login_token')) // Login token
			c.write(os.hostname()); // Device name
			c.write('windows'); // Platform
		});

		c.on("data", function (buffer) {
			buffer = buffer.toString();
			if (buffer != "error") {
				store.set('device_id', buffer);
			}

			c.end();
		});
	} catch (e) {
		console.log(e);
	}
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
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
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

function delete_device (device_id) {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("delete_device");
			c.write(store.get('login_token')) // Login token
			c.write(device_id.toString());
		});

		c.on("data", function (buffer) {
			buffer = buffer.toString();
			if (buffer != "error") {
			}

			c.end();
		});
	} catch (e) {
		console.log(e);
	}
}

function update_device_ip () {
	externalip(function (err, ip) {
		// Update device external ip
		try {
			var c = net.createConnection(SERVER_PORT, SERVER_IP);
			c.on("connect", function() {
				// connected to TCP server.
				c.write("update_device_ip");
				c.write(store.get('login_token')) // Login token
				c.write(store.get('device_id')) // Device token
				c.write(ip);
			});

			c.on("data", function (buffer) {
				buffer = buffer.toString();
				if (buffer != "error") {
				}

				c.end();
			});
		} catch (e) {
			console.log(e);
		}
	});
}

function update_devices_list () {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("get_user_devices;;" + store.get('login_token'));
		});

		c.on("data", function (devices_json) {
			devices_json = devices_json.toString();
			console.log('devices json: ' + devices_json);
			c.end();

			mainWindow.webContents.send('devices', JSON.parse(devices_json))
		});
	} catch (e) {
		console.log(e);
	}
}

function update_files_list () {
	try {
		var socket = net.createConnection(SERVER_PORT, SERVER_IP);
		socket.on("connect", function() {
			// connected to TCP server.
			socket.write("get_user_files;;" + store.get('login_token') + ";;3");
 		});

		socket.on("data", function (buffer) {
			files_json = buffer.toString();
			files = JSON.parse(files_json)
			mainWindow.webContents.send('files', files);
			console.log(files);
			socket.end();
		});
	} catch (e) {
		console.log(e);
	}
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

ipc.on('delete_device', function (event, device_id) {
	delete_device(device_id);
	
	index_to_delete = 0;
	mainWindow.context.devices.forEach(device => {
		if (device.id == device_id) {
			mainWindow.context.devices.splice(index_to_delete, 1);
		}

		index_to_delete++;
	});
});

ipc.on('select_file', function (event, device_id) {
	files = dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });

	i = 0;
	files.forEach(file => {
		i++;

		setTimeout(function () {
			register_file(file);
		}, 300 * i);
	});
});

ipc.on('select_folder', function (event, device_id) {
	folders = dialog.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] });
});

// Register file in the DB
function register_file (path) {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("register_file");
			c.write(store.get('login_token')) // Login token
			c.write(store.get('device_id')) // Device token
			c.write(path);
		});

		c.on("data", function (buffer) {
			buffer = buffer.toString();
			if (buffer != "error") {
			}

			c.end();
		});
	} catch (e) {
		console.log(e);
	}
}

// File send
function file_listen () {
	port = 1234;

	var server = net.createServer(function(connection) {
		console.log('client connected');
	
		connection.on('close', function (){
			console.log('client disconnected');
		 });
	
		connection.on('data', function (data) {
			data = data.toString();
			console.log('client sended the folowing string:'+data);
			connection.write("Response");
			console.log('Sended responst to client');
			connection.end();
			console.log('Disconnected the client.');
	   });
	
	});
	
	
	server.listen(port, function () {
		console.log('server is listening');
	});
}

// file_ask_listen();
// recieve_file();

function file_ask_listen () {
	try {
		var server = net.createServer(function(client){
			var packages = 0;
			var totalBytes = 0;
			var filename = "4.jpg";
			var readStream = fs.createReadStream('C:\\Users\\yakov\\Desktop\\' + filename, {highWaterMark: 16384});


			readStream.on('data', function(chunk) {
				packages++;    
				var head = new Buffer("FILE");
				var sizeHex = chunk.length.toString(16);

				while (sizeHex.length < 4) {
					sizeHex = "0" + sizeHex;
				}
				
				var size = new Buffer(sizeHex);
				console.log("size", chunk.length, "hex", sizeHex);
				var delimiter = new Buffer("@");
				var pack = Buffer.concat([head, size, chunk, delimiter]);
				totalBytes += pack.length;
				client.write(pack);
			});

			readStream.on('close', function(){
				client.end();
				console.log("total packages", packages);
				console.log("total bytes sent", totalBytes);
			});
			
			client.on('error', function(){
				console.log("error del cliente");
			});
			
			client.on('close', function(){
				console.log("terminó comunicación con cliente");
			});
		});
		
		server.listen(5000);
		
		server.on('listening', function(){
			console.log("servidor escuchando");
		});

		server.on('error', function(err){
			console.log("error del servidor");
		});		  
	} catch (e) {
		console.log(e);
	}
}

function recieve_file () {
	var socket = new net.Socket();
	socket.connect(5000, "127.0.0.1");
	var packets = 0;
	var buffer = new Buffer(0);
	var filename = '';

	socket.on('data', function(chunk) {
		packets++;
		console.log(chunk);
		buffer = Buffer.concat([buffer, chunk]);
	});

	socket.on('close', function(){
		console.log("total packages", packets);

		var writeStream = fs.createWriteStream(path.join(__dirname, "out.jpg"));
		console.log("buffer size", buffer.length);
		while (buffer.length) {
			var head = buffer.slice(0, 4);

			console.log("head", head.toString());
			if(head.toString() != "FILE"){
				console.log("ERROR!!!!");
				process.exit(1);
			}
			var sizeHex = buffer.slice(4, 8);
			var size = parseInt(sizeHex, 16);

			console.log("size", size);

			var content = buffer.slice(8, size + 8);
			var delimiter = buffer.slice(size + 8, size + 9);
			// console.log("delimiter", delimiter.toString());
			// if(delimiter != "@"){
			// 	console.log("wrong delimiter!!!");
			// 	process.exit(1);
			// }

			writeStream.write(content);
			buffer = buffer.slice(size + 9);
		}

		setTimeout(function(){
			writeStream.end();
		}, 2000);
	});
}
