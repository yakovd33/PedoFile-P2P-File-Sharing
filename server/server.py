import sys, signal
import os
from socket import *
from database import DB
from functions import *
from urllib.parse import unquote
import json

try:
    HOST = "127.0.0.1"
    PORT = 8008
    s = socket(AF_INET, SOCK_STREAM)
    s.bind((HOST, PORT))
    s.listen(999)
except :
    sys.exit()

db = DB()

def get_socket_msg (conn) :
    return str(conn.recv(1024).decode('utf-8'))

def send_socket_msg (conn, msg) :
    conn.send(msg.encode())

def login (conn, email, password) :
    user_query = db.select_query('users', "`email` = '" + email + "' AND `password_hashed` = '" + password_hash(password) + "'", '')
    if (db.rowCount > 0) :
        # Insert login token
        user_id = str(user_query[0][0])
        hash = random_hash()

        db.query("INSERT INTO `login_tokens` (`user_id`, `hash`) VALUES (" + user_id + ", '" + hash + "')")
        token_id = db.lastInsertId
        token_query = db.select_query('login_tokens', '`id` = ' + str(token_id), '')
        hash = token_query[0][2]
        send_socket_msg(conn, hash)
    else :
        # Incorrect details
        send_socket_msg(conn, 'incorrect')
        pass

def signup (conn) :
    email = unquote(get_socket_msg(conn))
    password = get_socket_msg(conn)

    # TODO: Validate email format ##########################################################
    
    # Check if email exists
    email_query = db.select_query("users", "`email` = '" + email + "'", "")
    if db.rowCount == 0 :
        insert_query = db.query("INSERT INTO `users` (`email`, `password_hashed`) VALUES ('" + email + "', '" + password_hash(password) + "')")
        send_socket_msg(conn, 'success')
    else :
        # Email exists
        send_socket_msg(conn, 'Email address already exists')

def signup_device (conn) :
    login_token = unquote(get_socket_msg(conn))
    device_name = unquote(get_socket_msg(conn))
    platform = unquote(get_socket_msg(conn))
    user_id = str(get_user_id_by_login_token(login_token, db))
    
    if user_id is not 'False' :
        # Insert device
        db.query("INSERT INTO `devices` (`user_id`, `name`, `last_active`, `platform`) VALUES (" + user_id + ", '" + device_name + "', '" + get_timestamp() + "', '" + platform + "')")
        send_socket_msg(conn, str(db.lastInsertId))

def get_user_files (conn, login_token, limit) :
    user_id = str(get_user_id_by_login_token(login_token, db))

    if user_id is not 'False' :
        user_files_query = db.select_query('files', 'user_id = ' + user_id, 'ORDER BY `uploaded` DESC LIMIT ' + limit)
        files = []
        for file in user_files_query :
            tmp_file = {}
            tmp_file['id'] = file[0]
            tmp_file['name'] = file[1]
            tmp_file['extension'] = file[6][1:]
            tmp_file['path'] = file[7]
            files.append(tmp_file)
        
        send_socket_msg(conn, json.dumps(files))

def get_user_devices (conn, login_token) :
    user_id = str(get_user_id_by_login_token(login_token, db))

    if user_id is not 'False' :
        user_devices_query = db.select_query('devices', 'user_id = ' + user_id + " AND `active`", '')
        devices = []
        for device in user_devices_query :
            tmp_device = {}
            tmp_device['id'] = device[0]
            tmp_device['name'] = device[2]
            tmp_device['platform'] = device[3]
            tmp_device['last_active'] = humanize_time(device[4])
            devices.append(tmp_device)
        
        send_socket_msg(conn, json.dumps(devices))

def delete_device (conn) :
    login_token = unquote(get_socket_msg(conn))
    user_id = str(get_user_id_by_login_token(login_token, db))
    device_id = unquote(get_socket_msg(conn))

    if user_id is not 'False' :
        # Check if user is the owner of the device
        db.select_query('devices', '`user_id` = ' + user_id + " AND `id` = " + device_id, '')
        if db.rowCount > 0 :
            db.query("UPDATE `devices` SET `active` = 0 WHERE `id` = " + device_id)

def update_device_ip (conn) :
    login_token = unquote(get_socket_msg(conn))
    device_id = unquote(get_socket_msg(conn))
    user_id = str(get_user_id_by_login_token(login_token, db))
    ip = unquote(get_socket_msg(conn))

    if user_id is not 'False' :
        # Check if user is the owner of the device
        db.select_query('devices', '`user_id` = ' + user_id + " AND `id` = " + device_id, '')
        if db.rowCount > 0 :
            db.query("UPDATE `devices` SET `ip` = '" + ip + "' WHERE `id` = " + device_id)

        send_socket_msg(conn, 'true')

def register_file (conn, login_token, device_id, path, md5) :
    user_id = str(get_user_id_by_login_token(login_token, db))

    if user_id is not 'False' :
        filename_w_ext = os.path.basename(path)
        filename, file_extension = os.path.splitext(filename_w_ext)

        # Check if user is the owner of the device
        db.select_query('devices', '`user_id` = ' + user_id + " AND `id` = " + device_id, '')
        if db.rowCount > 0 :
            # Register the file
            db.query("INSERT INTO `files` (`name`, `user_id`, `device_id`, `path`, `extension`, `md5`, `auto_update`) VALUES ('" + filename + "', " + user_id + ", " + device_id + ", '" + path + "', '" + file_extension + "', '" + md5 + "', 0)")
            db.query("INSERT INTO `files` (`name`, `user_id`, `device_id`, `path`, `extension`, `md5`) VALUES ('" + filename + "', " + user_id + ", " + device_id + ", '" + path + "', '" + file_extension + "', '" + md5 + "' )")

            resp = {
                'id': db.lastInsertId,
                'extension': file_extension,
            }

            send_socket_msg(conn, json.dumps(resp))

def get_file_device_details (conn, login_token, file_id) :
    user_id = str(get_user_id_by_login_token(login_token, db))

    if user_id is not 'False' :
        file_query = db.select_query('files', '`id` = ' + str(file_id) + ' AND `user_id` = ' + str(user_id), '')

        if db.rowCount > 0 :
            device_id = file_query[0][3]
            device_query = db.select_query('devices', '`id` = ' + str(device_id) + ' AND `user_id` = ' + str(user_id), '')

            if db.rowCount > 0 :
                response = {
                    'ip': device_query[0][5],
                    'port': device_query[0][6]
                }

                send_socket_msg(conn, json.dumps(response))

def get_file_path_by_id (conn, login_token, file_id) :
    user_id = str(get_user_id_by_login_token(login_token, db))

    if user_id is not 'False' :
        file_query = db.select_query('files', '`id` = ' + str(file_id) + ' AND `user_id` = ' + user_id, '')

        if db.rowCount > 0 :
            send_socket_msg(conn, file_query[0][7])
    send_socket_msg(conn, '')

def save_file_version (conn, login_token, file_id, hash, path) :
    user_id = str(get_user_id_by_login_token(login_token, db))
    file = db.select_query('files', '`id` = ' + file_id, '')

    if str(file[0][2]) == str(user_id) :
        if user_id is not 'False' :
            db.query("INSERT INTO `file_versions` (`file_id`, `md5`, `path`) VALUES (" + file_id + ", '" + hash + "', '" + path + "')")

    send_socket_msg(conn, '')

def get_file_versions_list (conn, login_token, file_id) :
    user_id = str(get_user_id_by_login_token(login_token, db))
    file = db.select_query('files', '`id` = ' + file_id, '')

    if str(file[0][2]) == str(user_id) :
        if user_id is not 'False' :
            versions_stmt = db.select_query('file_versions', '`file_id` = ' + str(file_id), 'ORDER BY `date` DESC')
            versions = []
            
            for version in versions_stmt :
                tmp_version = {
                    'id': version[0],
                    'file_id': version[1],
                    'hash': version[2],
                    'path': version[3],
                    'date': version[4]
                }

                versions.append(tmp_version)

    send_socket_msg(conn, json.dumps(versions))

def delete_version (conn, login_token, version_id) :
    user_id = str(get_user_id_by_login_token(login_token, db))
    version = db.select_query('file_versions', '`id` = ' + version_id, '')
    file = db.select_query('files', '`id` = ' + str(version[0][1]), '')

    if str(file[0][2]) == str(user_id) :
        if user_id is not 'False' :
            db.query("DELETE FROM `file_versions` WHERE `id` = " + str(version_id))
            send_socket_msg(conn, '')

    send_socket_msg(conn, '')

def auto_sync (conn, login_token, file_id, device_id, path) :
    user_id = str(get_user_id_by_login_token(login_token, db))
    file = db.select_query('files', '`id` = ' + file_id, '')
    db.select_query('devices', '`user_id` = ' + user_id + " AND `id` = " + device_id, '')

    if db.rowCount > 0 :
        if str(file[0][2]) == str(user_id) :
            if user_id is not 'False' :
                # Get source device id
                source_device_id_stmt = db.select_query('files', '`id` = ' + file_id, '')
                source_device_id = source_device_id_stmt[0][3]

                db.select_query('auto_update', '`device_id` = ' + device_id + " AND `file_id` = " + file_id, '')
                if db.rowCount > 0:
                    db.query("DELETE FROM `auto_update` WHERE `device_id` = " + str(device_id) + " AND `file_id` = " + str(file_id))
                else:
                    db.query("INSERT INTO `auto_update` (`device_id`, `file_id`, `path`, `source_device_id`) VALUES (" + device_id + ", '" + file_id + "', '" + path + "', " + str(source_device_id) + ")")
                    # db.query("INSERT INTO `auto_update` (`device_id`, `file_id`) VALUES (" + device_id + ", '" + file_id + "')")

def get_file_details (conn, login_token, file_id) :
    user_id = str(get_user_id_by_login_token(login_token, db))
    file = db.select_query('files', '`id` = ' + str(file_id), '')

    if str(file[0][2]) == str(user_id) :
        if user_id is not 'False' :
            send_socket_msg(conn, json.dumps(file[0]))
    send_socket_msg(conn, '')

def get_version_details (conn, login_token, version_id) :
    user_id = str(get_user_id_by_login_token(login_token, db))
    version = db.select_query('file_versions', '`id` = ' + version_id, '')
    file = db.select_query('files', '`id` = ' + str(version[0][1]), '')

    if str(file[0][2]) == str(user_id) :
        if user_id is not 'False' :
            send_socket_msg(conn, json.dumps(version[0]))
    send_socket_msg(conn, '')

def get_user_sync_files (conn, login_token, device_id) :
    user_id = str(get_user_id_by_login_token(login_token, db))

    if user_id is not 'False' :
        # Check if user is the owner of the device
        db.select_query('devices', '`user_id` = ' + user_id + " AND `id` = " + device_id, '')
        if db.rowCount > 0 :
            files_query = db.select_query('auto_update', '`source_device_id` = ' + str(device_id), 'GROUP BY `file_id`')

            files = []
            for file in files_query :
                file = get_file_by_id(file[2], db)
                if file is not 'False' :
                    files.append(file)
                    print(file)

            send_socket_msg(conn, json.dumps(files))
            return 0
    send_socket_msg(conn, '')

def pend_file_to_synced_devices (conn, login_token, file_id, new_hash) :
    # Pend file to synced devices
    user_id = str(get_user_id_by_login_token(login_token, db))
    file = get_file_by_id(file_id, db)

    if str(file[2]) == str(user_id) :
        if user_id is not 'False' :
            auto_updates = db.select_query('auto_update', '`file_id` = ' + str(file_id), '')
            
            for auto_update in auto_updates :
                device_id = auto_update[1]

                db.query("INSERT INTO `pending_updates` (`file_id`, `dest_device_id`) VALUES (" + file_id + ", " + str(device_id) + ")")

        # Update new MD5
        db.query("UPDATE `files` SET `md5` = '" + new_hash + "' WHERE `id` = " + str(file_id))

def get_device_pending_update_files (conn, login_token, device_id) :
    user_id = str(get_user_id_by_login_token(login_token, db))

    if user_id is not 'False' :
        # Check if user is the owner of the device
        db.select_query('devices', '`user_id` = ' + user_id + " AND `id` = " + device_id, '')
        if db.rowCount > 0 :
            pending_updates = db.select_query('pending_updates', '`dest_device_id` = ' + str(device_id), '')
            
            file_ids = []
            # Required Fields: ID, DEST

            for pending_update in pending_updates :
                # Get the dest of the synced file
                file_id = pending_update[1]
                row = db.select_query('auto_update', '`device_id` = ' + str(device_id) + ' AND `file_id` = ' + str(file_id), '')

                if db.rowCount > 0 :
                    dest = row[0][3]
                    file_ids.append({
                        'file_id': file_id,
                        'dest': dest
                    })

                # Delete pending change
                db.query("DELETE FROM `pending_updates` WHERE `id` = " + str(pending_update[0]))
            
            send_socket_msg(conn, json.dumps(file_ids))

while True :
    conn, addr = s.accept()
    print("Connected by: " , addr)

    data = get_socket_msg(conn)
    tokens = get_tokens(data)
    action = tokens[0]

    if len(tokens) == 1 :
        action = data

    print(tokens)

    if action == "login" :
        login(conn, tokens[1], tokens[2])
    elif action == "signup" :
        signup(conn)
    elif action == "signup_device" :
        signup_device(conn)
    elif action == "get_user_devices" :
        get_user_devices(conn, tokens[1])
    elif action == "delete_device" :
        delete_device(conn)
    elif action == "update_device_ip" :
        update_device_ip(conn)
    elif action == "register_file" :
        register_file(conn, tokens[1], tokens[2], tokens[3], tokens[4])
    elif action == "get_user_files" :
        get_user_files(conn, tokens[1], tokens[2])
    elif action == "get_file_device_details" :
        get_file_device_details(conn, tokens[1], tokens[2])
    elif action == "get_file_path_by_id" :
        get_file_path_by_id(conn, tokens[1], tokens[2])
    elif action == "save_file_version" :
        save_file_version(conn, tokens[1], tokens[2], tokens[3], tokens[4])
    elif action == "get_file_versions_list" :
        get_file_versions_list(conn, tokens[1], tokens[2])
    elif action == "delete_version" :
        delete_version(conn, tokens[1], tokens[2])
    elif action == "get_file_details" :
        get_file_details(conn, tokens[1], tokens[2])
    elif action == "get_version_details" :
        get_version_details(conn, tokens[1], tokens[2])
    elif action == "auto_sync_file":
        auto_sync(conn, tokens[1], tokens[2], tokens[3], tokens[4])
    elif action == "get_user_sync_files" :
        get_user_sync_files(conn, tokens[1], tokens[2])
    elif action == "pend_file_to_synced_devices" :
        pend_file_to_synced_devices(conn, tokens[1], tokens[2], tokens[3])
    elif action == "get_device_pending_update_files" :
        get_device_pending_update_files(conn, tokens[1], tokens[2])


    conn.close()

s.close()