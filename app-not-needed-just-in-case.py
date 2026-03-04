from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import yt_dlp

import os
import urllib.request
from urllib.parse import quote

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
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', # Best video + audio
        'quiet': True,     # Terminal එකේ අනවශ්‍ය දේවල් print වෙන එක නවත්වන්න
        'merge_output_format': 'mp4'
    }

    try:
            # URL එකෙන් video details අදිනවා
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            original_title = info.get('title', 'video') # Video එකේ නම
            title = f"DE_DOWNLOADS.LK_{original_title}"

            formats_data = info.get('formats', [])
            available_formats = []
            seen_combos = set()
            
            for f in formats_data:
                ext = f.get('ext', '')
                vcodec = f.get('vcodec', 'none')
                acodec = f.get('acodec', 'none')
                fmt_url = f.get('url')
                
                has_video = vcodec != 'none'
                has_audio = acodec != 'none'
                
                # We need merged formats (video + audio), audio-only, OR video-only formats
                if not has_video and not has_audio:
                    continue
                    
                # Mark as 'Combined', 'Video Only', or 'Audio Only' depending on streams
                if has_video and has_audio:
                    format_type = "Combined"
                elif has_video and not has_audio:
                    format_type = "Video Only"
                elif not has_video and has_audio:
                    format_type = "Audio Only"
                else:
                    continue
                    
                display_ext = 'mp4a' if ext == 'm4a' else ext
                
                height = f.get('height')
                resolution = f"{height}p" if height else "Audio"
                    
                tbr = f.get('tbr')
                bitrate = f"{int(tbr)}kbps" if tbr else "N/A"

                combo = f"{display_ext}-{resolution}-{bitrate}"
                if combo in seen_combos:
                    continue
                seen_combos.add(combo)
                
                size = f.get('filesize')
                if size:
                    size_mb = f"{size / (1024*1024):.1f} MB"
                elif f.get('filesize_approx'):
                    size_mb = f"{f.get('filesize_approx') / (1024*1024):.1f} MB"
                else:
                    size_mb = "N/A"

                available_formats.append({
                    'ext': display_ext,
                    'resolution': resolution,
                    'type': format_type,
                    'size': size_mb,
                    'bitrate': bitrate,
                    'url': fmt_url
                })
            
            def sort_key(x):
                type_score = 0 if x['type'] == 'Video' else 1
                res_str = x['resolution'].replace('p', '')
                res_score = -int(res_str) if res_str.isdigit() else 0
                return (type_score, res_score)

            available_formats.sort(key=sort_key)
            
            if not available_formats:
                best_url = info.get('url')
                if best_url:
                    available_formats.append({
                        'ext': 'mp4',
                        'resolution': 'Default',
                        'type': 'Video',
                        'size': 'N/A',
                        'bitrate': 'N/A',
                        'url': best_url
                    })

            thumbnail_url = info.get('thumbnail', '')
            source_platform = info.get('extractor_key', 'Unknown')

            # ඒ ගත්ත විස්තර ටික JSON විදිහට Frontend එකට යවනවා
            return jsonify({
                'success': True,
                'title': title,
                'thumbnail': thumbnail_url,
                'source': source_platform,
                'formats': available_formats
            })
            
    except Exception as e:
        # මොකක් හරි අවුලක් ගියොත් error එක යවනවා
        return jsonify({'error': 'Video එක Download කිරීමට නොහැක. URL එක නිවැරදිදැයි පරීක්ෂා කරන්න.'}), 500

@app.route('/api/proxy')
def proxy_download():
    url = request.args.get('url')
    title = request.args.get('title', 'DE_DOWNLOADS.LK_video')
    
    if not url:
        return "No URL provided", 400

    def generate():
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as response:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    yield chunk
        except Exception as e:
            print(f"Proxy error: {e}")
            yield b""

    safe_title = quote(title.encode('utf-8'))
    
    return Response(
        generate(),
        headers={
            'Content-Disposition': f"attachment; filename*=UTF-8''{safe_title}.mp4",
            'Content-Type': 'video/mp4'
        }
    )

if __name__ == '__main__':
    # Server එක start කරනවා
    app.run(port=5000)