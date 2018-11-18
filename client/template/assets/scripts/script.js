let electron = require('electron');
let currentWindow = electron.remote.getCurrentWindow();
let context = currentWindow.context;

$.each($('*[pdf-context]'), function() {
    $(this).text(context[$(this).attr('pdf-context')]);
});