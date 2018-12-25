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

def login (conn) :
    email = unquote(get_socket_msg(conn))
    password = get_socket_msg(conn)
    
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
        user_files_query = db.select_query('files', 'user_id = ' + user_id, 'LIMIT ' + limit)
        files = []
        for file in user_files_query :
            tmp_file = {}
            tmp_file['id'] = file[0]
            tmp_file['name'] = file[1]
            tmp_file['extension'] = file[6][1:]
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

def register_file (conn) :
    login_token = unquote(get_socket_msg(conn))
    device_id = unquote(get_socket_msg(conn))
    user_id = str(get_user_id_by_login_token(login_token, db))
    path = unquote(get_socket_msg(conn))

    if user_id is not 'False' :
        filename_w_ext = os.path.basename(path)
        filename, file_extension = os.path.splitext(filename_w_ext)

        # Check if user is the owner of the device
        db.select_query('devices', '`user_id` = ' + user_id + " AND `id` = " + device_id, '')
        if db.rowCount > 0 :
            # Register the file
            db.query("INSERT INTO `files` (`name`, `user_id`, `device_id`, `path`, `extension`) VALUES ('" + filename + "', " + user_id + ", " + device_id + ", '" + path + "', '" + file_extension + "' )")

        send_socket_msg(conn, 'true')

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
        login(conn)
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
        register_file(conn)
    elif action == "get_user_files" :
        get_user_files(conn, tokens[1], tokens[2])
    elif action == "get_file_device_details" :
        get_file_device_details(conn, tokens[1], tokens[2])

    conn.close()

s.close()