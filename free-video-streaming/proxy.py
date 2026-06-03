#!/usr/bin/env python3
"""
本地代理服务器
用于解决本地使用时的跨域问题

使用方法:
1. 安装Python 3.x
2. 运行: python proxy.py
3. 访问: http://localhost:8080

功能:
- 提供静态文件服务
- 代理API请求解决跨域问题
- 代理视频流请求
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
import sys
from urllib.error import URLError, HTTPError

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CORSProxyHandler(http.server.SimpleHTTPRequestHandler):
    """支持CORS的代理请求处理器"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        """添加CORS头"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Range')
        self.send_header('Access-Control-Expose-Headers', 'Content-Length, Content-Range')
        super().end_headers()
    
    def do_OPTIONS(self):
        """处理预检请求"""
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        """处理GET请求"""
        # 检查是否是代理请求
        if self.path.startswith('/proxy/'):
            self.handle_proxy_request()
        else:
            super().do_GET()
    
    def handle_proxy_request(self):
        """处理代理请求"""
        try:
            # 提取目标URL
            target_url = self.path[7:]  # 移除 '/proxy/' 前缀
            
            if not target_url:
                self.send_error(400, 'Missing target URL')
                return
            
            # 解码URL
            target_url = urllib.parse.unquote(target_url)
            
            print(f'代理请求: {target_url}')
            
            # 创建请求
            req = urllib.request.Request(target_url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            req.add_header('Accept', '*/*')
            req.add_header('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8')
            
            # 处理Range请求（用于视频流）
            range_header = self.headers.get('Range')
            if range_header:
                req.add_header('Range', range_header)
            
            # 发送请求
            with urllib.request.urlopen(req, timeout=60) as response:
                # 读取响应
                content = response.read()
                content_type = response.headers.get('Content-Type', 'application/octet-stream')
                content_length = response.headers.get('Content-Length', len(content))
                
                # 发送响应
                self.send_response(response.status if hasattr(response, 'status') else 200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', content_length)
                
                # 转发Content-Range头
                content_range = response.headers.get('Content-Range')
                if content_range:
                    self.send_header('Content-Range', content_range)
                
                self.end_headers()
                self.wfile.write(content)
                
        except HTTPError as e:
            self.send_error(e.code, f'HTTP Error: {e.reason}')
        except URLError as e:
            self.send_error(502, f'URL Error: {e.reason}')
        except Exception as e:
            self.send_error(500, f'Server Error: {str(e)}')
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        # 只记录重要日志，减少刷屏
        if 'proxy' in str(args).lower() or 'error' in str(args).lower():
            print(f'[代理服务器] {format % args}')

def main():
    """启动服务器"""
    with socketserver.TCPServer(("", PORT), CORSProxyHandler) as httpd:
        print(f'''
========================================
  免费视频流媒体 - 本地代理服务器
========================================

服务器已启动: http://localhost:{PORT}

使用方法:
1. 打开浏览器访问: http://localhost:{PORT}
2. 或者打开 index.html 文件

功能说明:
- 自动代理API请求，解决跨域问题
- 代理视频流请求，支持在线播放
- 支持所有免费视频资源API

按 Ctrl+C 停止服务器
========================================
''')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n服务器已停止')
            httpd.shutdown()

if __name__ == '__main__':
    main()