import http.server
import socketserver
import json
import os

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            start_time = data.get('startTime', 'N/A')
            end_time = data.get('endTime', 'N/A')
            date_type = data.get('dateType', 'N/A')
            
            with open('date_answers.txt', 'w', encoding='utf-8') as f:
                f.write("Date Details:\n------------------\n")
                f.write(f"Start Time: {start_time}\n")
                f.write(f"End Time: {end_time}\n")
                f.write(f"Date Type: {date_type}\n")
                
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()
