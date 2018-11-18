let electron = require('electron');

const ipcRenderer = electron.ipcRenderer;

ipcRenderer.on('store-data', function (event,store) {
    // console.log(store);
    // alert(store);
});

ipcRenderer.send('hehehe', 'lalala');