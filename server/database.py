import sqlite3
from sqlite3 import Error

class DB :
    database = None
    link = None
    rowCount = 0
    lastInsertId = 0

    def __init__ (self) :
        database = "database.db"
 
        # create a database connection
        self.link = self.connect(database)

    def select_query (self, table, where, order) :
        self.rowCount = 0
        result = []

        cur = self.link.cursor()
        cur.execute("SELECT * FROM " + table + " WHERE 1 AND " + where + " " + order)
    
        rows = cur.fetchall()
    
        for row in rows:
            self.rowCount += 1
            # print(row[3])
            result.append(row)

        return result
        
    def query (self, query) :
        cur = self.link.cursor()
        cur.execute(query)
        self.link.commit()
        self.lastInsertId = cur.lastrowid
 
    def connect(self, db_file):
        try:
            link = sqlite3.connect(db_file)
            return link
        except Error as e:
            print(e)