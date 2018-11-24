import random
import hashlib
import string
import uuid

def password_hash (password) :
    return password

def id_generator(size=20, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))

def random_hash () :
    return str(random.getrandbits(128))