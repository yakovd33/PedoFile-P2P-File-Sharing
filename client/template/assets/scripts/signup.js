$("#signup-form").submit(function (e) {
    e.preventDefault();

    $("#signup-feedback").html('');
    if ($("#signup-pass-repeat").val() == $("#signup-pass").val()) {
        electron.ipcRenderer.send('signup_form_submit', $(this).serialize());
    } else {
        $("#signup-feedback").html('Passwords don\'t match');
    }
});

electron.ipcRenderer.on('feedback', function (event, feedback) {
    $("#signup-feedback").html(feedback);
});