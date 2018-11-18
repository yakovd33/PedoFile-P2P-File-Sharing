from socket import *
from database import DB

# HOST = "127.0.0.1"
# PORT = 8008
# s = socket(AF_INET, SOCK_STREAM)
# s.bind((HOST, PORT))
# s.listen(999)
# conn, addr = s.accept()

db = DB()
db.select_query('albums', '1', '')

# print("Connected by: " , addr)
# while True :
#     data = conn.recv(1024)
#     print("Received: ", repr(data))

# conn.close()