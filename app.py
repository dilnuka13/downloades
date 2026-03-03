from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

import os

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app) # HTML එකෙන් එන requests block නොවී තියාගන්න මේක උදව් වෙනවා.

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

# මේක තමයි අපේ API Endpoint එක
@app.route('/api/download', methods=['POST'])
def get_video_link():
    # Frontend එකෙන් එවන data එක ගන්නවා
    data = request.get_json()
    url = data.get('url')

    if not url:
        return jsonify({'error': 'කරුණාකර URL එකක් ඇතුලත් කරන්න!'}), 400

    # yt-dlp සඳහා settings
    ydl_opts = {
        'format': 'best', # තියෙන හොඳම quality එක ගන්න
        'quiet': True     # Terminal එකේ අනවශ්‍ය දේවල් print වෙන එක නවත්වන්න
    }

    try:
        # URL එකෙන් video details අදිනවා
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_url = info.get('url', None) # Direct Download Link එක
            title = info.get('title', 'Unknown Video') # Video එකේ නම

            # ඒ ගත්ත විස්තර ටික JSON විදිහට Frontend එකට යවනවා
            return jsonify({
                'success': True,
                'title': title,
                'download_url': video_url
            })
            
    except Exception as e:
        # මොකක් හරි අවුලක් ගියොත් error එක යවනවා
        return jsonify({'error': 'Video එක Download කිරීමට නොහැක. URL එක නිවැරදිදැයි පරීක්ෂා කරන්න.'}), 500

if __name__ == '__main__':
    # Server එක start කරනවා
    app.run(port=5000)