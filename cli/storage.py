import json
import os
from pytonconnect.storage import IStorage


class FileStorage(IStorage):
    def __init__(self, path):
        self._path = str(path)
        self._data: dict = {}
        if os.path.exists(self._path):
            try:
                with open(self._path) as f:
                    self._data = json.load(f)
            except Exception:
                self._data = {}

    def _save(self):
        with open(self._path, 'w') as f:
            json.dump(self._data, f)

    async def set_item(self, key: str, value: str):
        self._data[key] = value
        self._save()

    async def get_item(self, key: str, default_value: str = None):
        return self._data.get(key, default_value)

    async def remove_item(self, key: str):
        self._data.pop(key, None)
        self._save()
