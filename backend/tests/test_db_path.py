import os
import sqlite3


def test_database_path_is_file_not_directory():
    db_path = os.path.join(os.path.dirname(__file__), '..', 'inventario.db')
    assert os.path.exists(db_path), 'La ruta de la base de datos no existe'
    assert not os.path.isdir(db_path), 'La ruta de la base de datos no debe ser un directorio'

    conn = sqlite3.connect(db_path)
    try:
        assert conn.execute('select 1').fetchone()[0] == 1
    finally:
        conn.close()
