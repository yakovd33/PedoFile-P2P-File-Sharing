const { app, BrowserWindow } = require('electron');
let mainWindow;
const ipc = require('electron').ipcMain;
var net = require('net');
var util = require('util');
var os = require('os');
let externalip = require('externalip');
var fs = require('fs');
var path = require('path');
const { dialog } = require('electron');
var tmp = require('tmp');
const md5File = require('md5-file');
var tcpPortUsed = require('tcp-port-used');
var virustotal = require('node-virustotal');

// VirusTotal
var vtconn = virustotal.MakePublicConnection();
vtconn.setKey("5dcce6e2a727e29ff559c69cd2ffcb26310f678cd307e50c7d116b54726a2879");
// console.log("VirusTotal API: " + vtconn.getKey());
vtconn.setDelay(1500);
var virusData;
// console.log("VirusTotal Delay: " + vtconn.getDelay());

var page_number = 0;
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
		update_email();
		update_page_numbers();
		update_server_settings();
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
			c.write("login;;" + email + ";;" + password);
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
				// console.log(buffer);
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
			socket.write("get_user_files;;" + store.get('login_token') + ";;" + ((page_number-1)*8) + ";;" + "");
 		});

		socket.on("data", function (buffer) {
			files_json = buffer.toString();
			files = JSON.parse(files_json)
			mainWindow.webContents.send('files', files);
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

ipc.on('change_page', function (event, page_id) {
	change_page(page_id);
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
	if (files) {
		if (files.length) {
			files.forEach(file => {
				i++;

				setTimeout(function () {
					register_file(file);
				}, 300 * i);
			});
		}
	}
});

ipc.on('select_folder', function (event, device_id) {
	i = 0;
	folders = dialog.showOpenDialog({ properties: [ 'openFile', 'openDirectory', 'multiSelections' ] }, function (folder) {
		i++;
		setTimeout(function () {
			fs.readdir(folder.toString(), function(err, dir) {
				j = 0;

				for(let path of dir) {
					j++;

					setTimeout(function () {
						register_file(folder + '\\' + path);
					}, j * 500);
				}
			});
		}, i * 1000);
	});
});

ipc.on('save-file', function (event, file) {
	dialog.showSaveDialog({
		defaultPath: '~/' + file.name + '.' + file.extension,
	}, function (dest) {
		save_file(file, dest);
	});
});

ipc.on('preview-file', function (event, file) {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("get_file_device_details;;" + store.get('login_token') + ";;" + file.id);
		});

		c.on("data", function (buffer) {
			buffer = buffer.toString();
			json = JSON.parse(buffer);
			c.end();

			tmp.file(function _tempFileCreated(err, path, fd, cleanupCallback) {
				if (!err) {
					recieve_file(json.ip, json.port, path, file.id, true);

					// setTimeout(cleanupCallback, 2000);
				} else {
					console.log(err);
				}
			});
		});
	} catch (e) {
		console.log(e);
	}
});

ipc.on('save-version-file', function (event, file) {
	save_file_version(file.id, file.extension, file.path);
});

ipc.on('show-versions-file', function (event, file) {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("get_file_versions_list;;" + store.get('login_token') + ";;" + file.id);
		});

		c.on("data", function (buffer) {
			buffer = buffer.toString();
			json = JSON.parse(buffer);
			mainWindow.webContents.send('versions', json);
			c.end();
		});
	} catch (e) {
		console.log(e);
	}
});

ipc.on('delete_version', function (event, version_id) {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			c.write("delete_version;;" + store.get('login_token') + ";;" + version_id);
		});

		c.on("close", function (buffer) {
			buffer = buffer.toString();

			var socket = net.createConnection(SERVER_PORT, SERVER_IP);
			socket.on("connect", function() {
				socket.write("get_version_details;;" + store.get('login_token') + ";;" + version_id);
			});

			socket.on("data", function (buffer) {
				buffer = buffer.toString();
				version = JSON.parse(buffer);
				socket.end();
				
				var c = net.createConnection(SERVER_PORT, SERVER_IP);
				c.on("connect", function() {
					c.write("get_file_details;;" + store.get('login_token') + ";;" + version[1]);
				});

				c.on("data", function (buffer) {
					file = JSON.parse(buffer.toString());
					file_to_delete = app.getPath('userData') + '\\' + version[2] + file[6];
					fs.unlink(file_to_delete, (err) => {
						if (err) throw err;
						console.log('path/file.txt was deleted');
					});
				});
			});
		});
	} catch (e) {
		console.log(e);
	}
});

ipc.on('restore_version', function (event, details) {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("get_file_details;;" + store.get('login_token') + ";;" + details.file_id);
		});

		c.on("data", function (buffer) {
			buffer = buffer.toString();
			json = JSON.parse(buffer);
			extension = json[6];
			path = json[7];

			fs.copyFile(details.path, path, (err) => {
				if (!err) {
				}
			});

			c.end();
		});
	} catch (e) {
		console.log(e);
	}
});


ipc.on('auto-sync-file', function (event, details) {
	dialog.showSaveDialog({
		defaultPath: '~/' + details.name + '.' + details.extension,
	}, function (dest) {
		save_file(details, dest);

		try {
			var c = net.createConnection(SERVER_PORT, SERVER_IP);
			c.on("connect", function() {
				// connected to TCP server.
			});
		} catch (e) {
			console.log(e);
		}
	});
});

ipc.on('sync-file', function (event, details) {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("sync_file;;" + store.get('login_token') + ";;" + details.file_id + ";;" + store.get('device_id'));
		});

		c.on("data", function (buffer) {

			c.end();
		});
	} catch (e) {
		console.log(e);
	}
});

ipc.on('dnd-upload', function (event, path) {
	register_file(path);
});

ipc.on('search-file', function (event, file_to_search) {
	try {
		var socket = net.createConnection(SERVER_PORT, SERVER_IP);
		socket.on("connect", function() {
			// connected to TCP server.
			socket.write("get_user_files;;" + store.get('login_token') + ";;" + ((page_number-1)*8) + ";;" + file_to_search);
 		});

		socket.on("data", function (buffer) {
			files_json = buffer.toString();
			files = JSON.parse(files_json)
			mainWindow.webContents.send('files', files);
			socket.end();
		});
	} catch (e) {
		console.log(e);
	}
});

// Register file in the DB
function register_file (path) {
	try {
		var file_hash = md5File.sync(path);
		var viruses_found = 0;
		vtconn.getFileReport(file_hash, function(virusData){
			//console.log(virusData);
			//console.log("Viruses: " + virusData['positives']);
			viruses_found = virusData['positives'];

		  }, function(e){
			//console.log(e);
		  });
		
		if(viruses_found == 0)
		{
			md5File(path, function (err, hash) {
				var c = net.createConnection(SERVER_PORT, SERVER_IP);
				c.on("connect", function() {
					// connected to TCP server.
					c.write("register_file;;" + store.get('login_token') + ";;" + store.get('device_id') + ";;" + path + ";;" + hash);
				});

				c.on("data", function (file) {
					file = file.toString();
					if (file != "error") {
						json = JSON.parse(file)
						save_file_version(json.id, json.extension, path);
						update_files_list();
					}

					c.end();
				});
			});
		}
		else
		{
			//TODO: add user popup
			dialog.showErrorBox("Virus Found!", viruses_found + " Viruses Founded!");
			console.log("VirusTotal: " + viruses_found + " viruses founded!");
		}

		
	} catch (e) {
		console.log(e);
	}
}

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

tcpPortUsed.check(1234, '127.0.0.1').then(function(inUse) {
	if (!inUse) {
		file_listen();
	}
}, function(err) {
    console.error('Error on check:', err.message);
});

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
	var buffer = new Buffer.alloc(0);
	var filename = '';
	var not_connected = false;
	var totalBytes = 0;

	socket.on("connect", function() {
		socket.write(file_id.toString());
	});

	socket.on('data', function(chunk) {
		packets++;
		// chunk = decrypt(chunk.toString());
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

					// if(head.toString() != "FILE"){
					// 	console.log("ERROR!!!!");
					// 	process.exit(1);
					// }
					var sizeHex = buffer.slice(4, 8);
					var size = parseInt(sizeHex, 16);

					var content = buffer.slice(8, size + 8);
					var delimiter = buffer.slice(size + 8, size + 9);
					// console.log("delimiter", delimiter.toString());
					// if(delimiter != "@"){
					// 	console.log("wrong delimiter!!!");
					// 	process.exit(1);
					// }

					// console.log(content.toString());
					// console.log(decrypt(content.toString()));
					// content = decrypt(content.toString());
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

function save_file_version (file_id, extension, path) {
	// TODO: DISALLOW USERS TO SAVE THE SAME VERSION MORE THAN ONCE

	try {
		md5File(path, (err, hash) => {
			if (!err) {
				dest = app.getPath('userData') + '\\' + hash + '.' + extension;

				fs.copyFile(path, dest, (err) => {
					if (!err) {
						var c = net.createConnection(SERVER_PORT, SERVER_IP);
						c.on("connect", function() {
							// connected to TCP server.
							c.write("save_file_version;;" + store.get('login_token') + ";;" + file_id + ";;" + hash + ";;" + dest);
						});

						c.on("data", function (buffer) {
							buffer = buffer.toString();
							c.end();
						});
					}
				});
			} else {
				console.log('File does not exists or there was another error!');
			}
		});
	} catch (e) {
		console.log(e);
	}
}

function save_file (file, dest) {
	// TODO: Save empty files too

	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("get_file_device_details;;" + store.get('login_token') + ";;" + file.id);
		});

		c.on("data", function (buffer) {
			buffer = buffer.toString();
			json = JSON.parse(buffer);
			c.end();

			recieve_file(json.ip, json.port, dest, file.id, false);
		});
	} catch (e) {
		console.log(e);
	}
}

function update_email () {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("get_user_email;;" + store.get('login_token'));
		});

		c.on("data", function (email) {
			c.end();

			mainWindow.webContents.send('email', email.toString())
			console.log(email.toString())
		});
	} catch (e) {
		console.log(e);
	}
}
function update_page_numbers () {
	try {
		var c = net.createConnection(SERVER_PORT, SERVER_IP);
		c.on("connect", function() {
			// connected to TCP server.
			c.write("get_user_page_number;;" + store.get('login_token'));
		});

		c.on("data", function (pn_json) {
			pn_json = pn_json.toString();
			console.log(pn_json);
			c.end();

			mainWindow.webContents.send('page_number', JSON.parse(pn_json))
		});
	} catch (e) {
		console.log(e);
	}
}

function update_server_settings () {
	try {
		mainWindow.webContents.send('settings-server', SERVER_IP, SERVER_PORT)
		console.log(SERVER_IP.toString() + ":" + SERVER_PORT.toString())
	} catch (e) {
		console.log(e);
	}
}
// Nodejs encryption with CTR
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function encrypt(text) {
	let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return JSON.stringify({ dub: iv.toString('hex'), leh: encrypted.toString('hex') });
	
	// dub: IV
	// leh: encryptedData
}

function decrypt (text) {
	console.log(text);
	text = JSON.parse(text);
	let iv = Buffer.from(text.dub, 'hex');
	let encryptedText = Buffer.from(text.leh, 'hex');
	let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
	let decrypted = decipher.update(encryptedText);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
}

function change_page(page_id) {
	//console.log("Page #" + page_id);
	page_number = page_id;
	update_files_list();
}