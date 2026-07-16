import os
from waitress import serve
from backend.wsgi import application

port = int(os.environ.get('PORT', 8000))
host = os.environ.get('HOST', '0.0.0.0')
serve(application, host=host, port=port)
