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