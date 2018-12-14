import random
import hashlib
import string
import uuid
import time
import datetime
import timeago

def password_hash (password) :
    return password

def id_generator(size=20, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))

def random_hash () :
    return str(random.getrandbits(128))

def get_user_id_by_login_token (token, db) :
    row = db.select_query('login_tokens', '`hash` = "' + token + '"', '')
    print(row[0])
    return row[0][1]

def get_timestamp () :
    return datetime.datetime.fromtimestamp(time.time()).strftime('%Y-%m-%d %H:%M:%S')

def humanize_time (time) :
    return timeago.format(time)