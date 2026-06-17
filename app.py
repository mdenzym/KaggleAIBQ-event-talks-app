import time
import urllib.request
import xml.etree.ElementTree as ET
import re
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for feed data
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 3600  # 1 hour in seconds

def fetch_and_parse_feed():
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title_el = entry.find('atom:title', ns)
            date_str = title_el.text if title_el is not None else "Unknown Date"
            
            updated_el = entry.find('atom:updated', ns)
            updated_str = updated_el.text if updated_el is not None else ""
            
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ""
            
            # Split the content HTML by <h3> tags
            parts = re.split(r'<h3>(.*?)</h3>', content_html)
            sub_updates = []
            
            if len(parts) > 1:
                # The split leaves whatever is before the first <h3> (e.g. whitespace) as parts[0]
                # Then alternates: parts[1]=type, parts[2]=content, parts[3]=type, parts[4]=content...
                for i in range(1, len(parts), 2):
                    update_type = parts[i].strip()
                    update_content = parts[i+1].strip() if i+1 < len(parts) else ""
                    sub_updates.append({
                        "type": update_type,
                        "content": update_content
                    })
            else:
                # Fallback if no <h3> tags are found
                sub_updates.append({
                    "type": "General",
                    "content": content_html
                })
                
            entries.append({
                "date": date_str,
                "updated": updated_str,
                "updates": sub_updates
            })
            
        return entries, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache["data"] or (current_time - cache["last_fetched"] > CACHE_DURATION):
        data, error = fetch_and_parse_feed()
        if error:
            # Fall back to cache if available
            if cache["data"]:
                return jsonify({
                    "status": "warning",
                    "message": f"Failed to fetch updates ({error}). Showing cached content.",
                    "notes": cache["data"],
                    "cached_at": cache["last_fetched"]
                })
            return jsonify({"status": "error", "message": error}), 500
        
        cache["data"] = data
        cache["last_fetched"] = current_time
    
    return jsonify({
        "status": "success",
        "notes": cache["data"],
        "cached_at": cache["last_fetched"]
    })

if __name__ == '__main__':
    # Run locally on port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
