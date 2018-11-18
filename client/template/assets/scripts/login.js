$("#login-form").submit(function (e) {
    e.preventDefault();
    electron.ipcRenderer.send('login_form_submit', $(this).serialize());
})