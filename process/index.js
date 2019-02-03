const { app, BrowserWindow } = require('electron');
let mainWindow;
const ipc = require('electron').ipcMain;
var net = require('net');
var util = require('util');
var os = require('os');
var fs = require('fs');
var path = require('path');
const { dialog } = require('electron');
const md5File = require('md5-file');

let SERVER_IP = '127.0.0.1';
let SERVER_PORT = 8008;
let CLIENT_PATH = app.getPath('userData') + '..\\electron-quick-start';

// Local Storage
const Store = require('electron-store');
const store = new Store({
	cwd: CLIENT_PATH + '/Cookies',
});

store.set('login_token', '165492083334061971042258678136428790434');
store.set('device_id', '3');

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

// FUNCTION CALLS
pend_changes();
recieve_changes();
setInterval(pend_changes, 10000);
setInterval(recieve_changes, 20000);
recieve_changes();

// FUNCTIONS
function is_logged () {
	return (store.get('login_token') != '' && store.get('login_token') != undefined);
}

///////// UPDATE OWN FILES

function pend_changes () {
	// Get all files required to sync from this device

	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("get_user_sync_files;;" + store.get('login_token') + ";;" + store.get('device_id'));
		});

		c.on("data", function (buffer) {
			json = JSON.parse(buffer.toString());

			i = 0;
			json.forEach(file => {
				i++;
				console.log(file);
				file_id = file[0];
				file_path = file[7];
				md5 = file[12];

				setTimeout(function () {
					fs.exists(file_path, function (exists) {
						if (exists) {
							md5File(file_path, function (err, hash) {
								if (hash != md5) {
									console.log('File changed');
									var sock = net.createConnection(SERVER_PORT, SERVER_IP);
									sock.on("connect", function() {
										// connected to TCP server.
										sock.write("pend_file_to_synced_devices;;" + store.get('login_token') + ";;" + file_id + ";;" + hash);
									});

									sock.on("data", function (buffer) {
										sock.end();
									});
								}
							});
						}
					});
				}, i * 200);
			});

			c.end();
		});
	} catch (e) {
		console.log(e);
	}
}

function recieve_changes () {
	// Get pending updates files
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("get_device_pending_update_files;;" + store.get('login_token') + ";;" + store.get('device_id'));
		});

		c.on("data", function (buffer) {
			json = JSON.parse(buffer.toString());

			i = 0;
			json.forEach(file => {
				i++;
				console.log(file);
				file_id = file.file_id;
				dest = file.dest;
				save_file({ id: file_id }, dest);				
			});
		});
	} catch (e) {
		console.log(e);
	}
}

///////////////////////////////////////////////////////
// File send
function file_listen () {
	port = 1234;

	var server = net.createServer(function(connection) {
		console.log('client connected');
	
		connection.on('end', function (msg) {
			console.log('client disconnected');
		 });
	
		connection.on('data', function (file_id) {
			file_id = file_id.toString();
			
			// Get file path
			try {
				var c = net.createConnection(SERVER_PORT, SERVER_IP);
				c.on("connect", function() {
					// console.log('connectedddd');
					// connected to TCP server.
					c.write("get_file_path_by_id;;" + store.get('login_token') + ";;" + file_id);
				});
		
				c.on("data", function (path) {
					path = path.toString();
					if (path != '') {
						console.log(path);
						file_ask_listen(path, connection);
					}
		
					c.end();
				});
			} catch (e) {
				console.log(e);
			}
	   });
	});
	
	
	server.listen(port, function () {
		console.log('server is listening');
	});
}

file_listen();

function file_ask_listen (path, client) {
	if (fs.existsSync(path)) {
		try {
			var packages = 0;
			var totalBytes = 0;
			var readStream = fs.createReadStream(path, {highWaterMark: 16384});

			readStream.on('data', function(chunk) {
				packages++;    
				var head = new Buffer("FILE");
				var sizeHex = chunk.length.toString(16);

				while (sizeHex.length < 4) {
					sizeHex = "0" + sizeHex;
				}
				
				var size = new Buffer(sizeHex);
				var delimiter = new Buffer("@");
				var pack = Buffer.concat([head, size, chunk, delimiter]);
				totalBytes += pack.length;
				client.write(pack);
			});

			readStream.on('close', function(){
				client.end();
			});
			
			client.on('error', function(){
				console.log("file send error");
			});
			
			client.on('close', function(){
				console.log("connection closed");
			});
		} catch (e) {
			console.log(e);
		}
	} else {
		client.end();
	}
}

function recieve_file (ip, port, dest, file_id, is_preview) {
	var socket = new net.Socket();
	socket.connect(port, ip);
	var packets = 0;
	var buffer = new Buffer(0);
	var filename = '';
	var not_connected = false;
	var totalBytes = 0;

	socket.on("connect", function() {
		socket.write(file_id.toString());
	});

	socket.on('data', function(chunk) {
		packets++;
		buffer = Buffer.concat([buffer, chunk]);
		totalBytes += buffer.length;
	});

	socket.on('close', function(){
		if (!not_connected) {
			if (totalBytes > 0) {
				// var writeStream = fs.createWriteStream(path.join(__dirname, "out.jpg"));
				var writeStream = fs.createWriteStream(dest);

				while (buffer.length) {
					var head = buffer.slice(0, 4);

					if(head.toString() != "FILE"){
						console.log("ERROR!!!!");
						process.exit(1);
					}
					var sizeHex = buffer.slice(4, 8);
					var size = parseInt(sizeHex, 16);

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

				if (is_preview) {
					mainWindow.webContents.send('preview', dest);
				}

				setTimeout(function(){
					writeStream.end();
				}, 2000);
			} else {
				console.log('File does not exist');
			}
		} else {
			console.log('Source device is not connected');
		}
	});

	socket.on('error', function (error) {
		not_connected = true;
		if (error.code == 'ECONNREFUSED') {
			// console.log(error);
		}
	})
}

function save_file (file, dest) {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("get_file_device_details;;" + store.get('login_token') + ";;" + file.id);
		});

		c.on("data", function (buffer) {
			buffer = buffer.toString();
			json = JSON.parse(buffer);
			console.log(json);
			c.end();

			recieve_file(json.ip, json.port, dest, file.id, false);
		});
	} catch (e) {
		console.log(e);
	}
}