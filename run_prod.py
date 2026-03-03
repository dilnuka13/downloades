from waitress import serve
from app import app
import logging

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
    logger = logging.getLogger('waitress')
    logger.setLevel(logging.INFO)
    
    print("Starting DE Downloads production server on http://localhost:5000")
    serve(app, host='0.0.0.0', port=5000)
