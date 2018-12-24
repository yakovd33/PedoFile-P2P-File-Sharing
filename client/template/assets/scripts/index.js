$("#toggle-devices").click(function () {
    console.log('hehehe');
    $("#device-cards").toggleClass("active");
});

$.each($(".ui-card .toggle"), function () {
    $(this).click(function () {
        $(this).parent().toggleClass("sidebar-open");
    })
})

$.each($(".disconnect"), function () {
    $(this).click(function () {
        if (confirm('Are you sure you want to delete this device?')) {
            $(this).parent().parent().parent().parent().remove();
            delete_device($(this).data('id'));
            $("#devices-counter").html(parseInt($("#devices-counter").html()) - 1);
        }
    });
});

function delete_device (device_id) {
    electron.ipcRenderer.send('delete_device', device_id);
}

// File chooser
$(document).ready(function() {
    $("#container-floating").one("mouseenter touchend", function() {
        $("#container-floating .plus").addClass("activated");
        $('.lock-date').addClass("activated");
    });
});

$("#upload-file").click(function () {
    electron.ipcRenderer.send('select_file', '');
});

$("#upload-folder").click(function () {
    electron.ipcRenderer.send('select_folder', '');
});

electron.ipcRenderer.on('devices', function (event, devices) {
    $("#devices-counter").html(devices.length)

    devices.forEach(device => {
        var source = document.getElementById("device-template").innerHTML;
        var template = Handlebars.compile(source);
        var context = { id: device.id, platform: device.platform, name: device.name, last_active: device.last_active };
        var html = template(context);
        $("#device-cards ul.device-list").append(html);
    });
});

electron.ipcRenderer.on('files', function (event, files) {
    files.forEach(file => {
        var source = document.getElementById("file-template").innerHTML;
        var template = Handlebars.compile(source);
        var context = { id: file.id, name: file.name };
        var html = template(context);
        $("#recent-items").append(html);
    });
});