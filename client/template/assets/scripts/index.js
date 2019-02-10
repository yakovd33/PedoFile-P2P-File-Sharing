$("#toggle-devices").click(function () {
    console.log('hehehe');
    $("#device-cards").toggleClass("active");
});

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

    $.each($(".ui-card .toggle"), function () {
        $(this).click(function () {
            $(this).parent().toggleClass("sidebar-open");
        })
    })
});

electron.ipcRenderer.on('email', function (event, email) {
    $("#user_email").html(email)
});

electron.ipcRenderer.on('files', function (event, files) {
    $("#recent-items").html('');
    
    files.forEach(file => {
        var source = document.getElementById("file-template").innerHTML;
        var template = Handlebars.compile(source);
        var context = { id: file.id, name: file.name, extension: file.extension, path: file.path };
        var html = template(context);
        $("#recent-items").append(html);
    });

    $.each($(".recent-item"), function () {
        $(this).dblclick(function() {
            file_id = $(this).data('id');
            file_name = $(this).data('name');
            file_extension = $(this).data('extension');
            file = {
                id: file_id,
                name: file_name,
                extension: file_extension
            };
            
            electron.ipcRenderer.send('preview-file', file);
        });
    });
});

// Recent item context menu
(function() {
    function clickInsideElement( e, className ) {
        var el = e.srcElement || e.target;
        
        if ( el.classList.contains(className) ) {
        return el;
        } else {
        while ( el = el.parentNode ) {
            if ( el.classList && el.classList.contains(className) ) {
            return el;
            }
        }
        }

        return false;
    }

    function getPosition(e) {
        var posx = 0;
        var posy = 0;

        if (!e) var e = window.event;
        
        if (e.pageX || e.pageY) {
        posx = e.pageX;
        posy = e.pageY;
        } else if (e.clientX || e.clientY) {
        posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }

        return {
        x: posx,
        y: posy
        }
    }

    var contextMenuClassName = "context-menu";
    var contextMenuItemClassName = "context-menu__item";
    var contextMenuLinkClassName = "context-menu__link";
    var contextMenuActive = "context-menu--active";

    var taskItemClassName = "task";
    var taskItemInContext;

    var clickCoords;
    var clickCoordsX;
    var clickCoordsY;

    var menu = document.querySelector("#context-menu");
    var menuItems = document.querySelectorAll(".recent-item");
    var menuState = 0;
    var menuWidth;
    var menuHeight;
    var menuPosition;
    var menuPositionX;
    var menuPositionY;

    var windowWidth;
    var windowHeight;

    /**
     * Initialise our application's code.
     */
    function init() {
        contextListener();
        clickListener();
        keyupListener();
        resizeListener();
    }

    /**
     * Listens for contextmenu events.
     */
    function contextListener() {
        document.addEventListener( "contextmenu", function(e) {
        taskItemInContext = $(e.target).parents('.recent-item');

        if ($(e.target).parents('.recent-item').length) {
            e.preventDefault();
            toggleMenuOn();
            positionMenu(e);
        } else {
            taskItemInContext = null;
            toggleMenuOff();
        }
        });
    }

    /**
     * Listens for click events.
     */
    function clickListener() {
        document.addEventListener( "click", function(e) {
        var clickeElIsLink = clickInsideElement( e, contextMenuLinkClassName );

        if ( clickeElIsLink ) {
            e.preventDefault();
            menuItemListener( clickeElIsLink );
        } else {
            var button = e.which || e.button;
            if ( button === 1 ) {
            toggleMenuOff();
            }
        }
        });
    }

    /**
     * Listens for keyup events.
     */
    function keyupListener() {
        window.onkeyup = function(e) {
        if ( e.keyCode === 27 ) {
            toggleMenuOff();
        }
        }
    }

    /**
     * Window resize event listener
     */
    function resizeListener() {
        window.onresize = function(e) {
        toggleMenuOff();
        };
    }

    /**
     * Turns the custom context menu on.
     */
    function toggleMenuOn() {
        if ( menuState !== 1 ) {
        menuState = 1;
        menu.classList.add( contextMenuActive );
        }
    }

    /**
     * Turns the custom context menu off.
     */
    function toggleMenuOff() {
        if ( menuState !== 0 ) {
        menuState = 0;
        menu.classList.remove( contextMenuActive );
        }
    }

    /**
     * Positions the menu properly.
     * 
     * @param {Object} e The event
     */
    function positionMenu(e) {
        clickCoords = getPosition(e);
        clickCoordsX = clickCoords.x;
        clickCoordsY = clickCoords.y;

        menuWidth = menu.offsetWidth + 4;
        menuHeight = menu.offsetHeight + 4;

        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;

        if ( (windowWidth - clickCoordsX) < menuWidth ) {
        menu.style.left = windowWidth - menuWidth + "px";
        } else {
        menu.style.left = clickCoordsX + "px";
        }

        if ( (windowHeight - clickCoordsY) < menuHeight ) {
        menu.style.top = windowHeight - menuHeight + "px";
        } else {
        menu.style.top = clickCoordsY + "px";
        }
    }

    function menuItemListener( link ) {
        file_id = $(taskItemInContext).data('id');
        file_name = $(taskItemInContext).data('name');
        file_extension = $(taskItemInContext).data('extension');
        file_path = $(taskItemInContext).data('path');

        file = {
            id: file_id,
            name: file_name,
            extension: file_extension,
            path: file_path
        };

        action = $(link).data('action');
        
        electron.ipcRenderer.send(action + '-file', file);

        toggleMenuOff();
    }

    /**
     * Run the app.
     */
    init();
})();


electron.ipcRenderer.on('preview', function (event, path) {
    console.log(path);
    $("#image-preview").fadeIn();
    $("#image-preview-img img").attr('src', path);
});

$("#image-preview-close").click(function () {
    $("#image-preview").fadeOut();
});

$("#image-preview-bg").click(function () {
    $("#image-preview").fadeOut();
});

$(document).keyup(function(e) {
    if (e.key === "Escape") {
        $("#image-preview").fadeOut();
   }
});

electron.ipcRenderer.on('versions', function (event, versions) {
    $("#file-version-list-list").html('');

    versions.forEach(version => {
        var source = document.getElementById("file-version-list-item-template").innerHTML;
        var template = Handlebars.compile(source);
        version_path = version.path.replace(/\\/g, '\\\\');
        var context = { id: version.id, file_id: version.file_id, date: version.date, hash: version.hash, path: version_path };
        var html = template(context);

        $("#file-version-list-list").append(html);
    });

    $("#file-version-list").show();
});

function delete_version (version_id) {
    electron.ipcRenderer.send('delete_version', version_id);    
}

function restore_version (file_id, version_id, hash, path) {
    electron.ipcRenderer.send('restore_version', {
        file_id: file_id,
        version_id: version_id,
        hash: hash,
        path: path
    });

    $("#file-version-list-bg").click();
}

$("#file-version-list-bg").click(function () {
    $("#file-version-list").hide();
});

// File drag
$(document).ready(function() {
    $('input[type=file]').change(function() {
        console.log(this.files);
        var f = this.files;
        var el = $(this).parent();

        Array.from(this.files).forEach(file => {
            type = file.type;
            size = file.size;
            electron.ipcRenderer.send('dnd-upload', file.path);
            console.log(file);
        });

        $(this).val('');
        
        animateCss('#dnd-form-text i', 'wobble', function () {
            $("#dnd-form").fadeOut(300);
        });
    });

    $('input[type=file]').on('focus', function() {
        $(this).parent().addClass('focus');
    });

    $('input[type=file]').on('blur', function() {
        $(this).parent().removeClass('focus');
    });

    var dragTimer;
    $(document).on('dragover', function(e) {
        var dt = e.originalEvent.dataTransfer;
        if (dt.types && (dt.types.indexOf ? dt.types.indexOf('Files') != -1 : dt.types.contains('Files'))) {
            $("#dnd-form").fadeIn();
            window.clearTimeout(dragTimer);
        }
    });

    $(document).on('dragleave', function(e) {
        dragTimer = window.setTimeout(function() {
            $("#dnd-form").fadeOut(300);
        }, 25);
    });
});

function animateCss(element, animationName, callback) {
    const node = document.querySelector(element)
    node.classList.add('animated', animationName)

    function handleAnimationEnd() {
        node.classList.remove('animated', animationName)
        node.removeEventListener('animationend', handleAnimationEnd)

        if (typeof callback === 'function') callback()
    }

    node.addEventListener('animationend', handleAnimationEnd)
}

