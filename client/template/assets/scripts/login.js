$("#login-form").submit(function (e) {
    e.preventDefault();
    electron.ipcRenderer.send('login_form_submit', $(this).serialize());
});

electron.ipcRenderer.on('incorrect', function () {
    $("#feedback").html('Email or password don\'t match.');
});