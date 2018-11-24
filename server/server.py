import sys, signal
from socket import *
from database import DB
from functions import *
from urllib.parse import unquote

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

while True :
    try :
        conn, addr = s.accept()
        print("Connected by: " , addr)

        data = get_socket_msg(conn)

        if (data == "login") :
            login(conn)
    except KeyboardInterrupt :
        sys.exit()
conn.close()