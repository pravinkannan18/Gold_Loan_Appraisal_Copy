"""GPS Location Service for Gold Loan Appraisal System"""
import os
import time
import requests
import base64
from datetime import datetime
from dotenv import load_dotenv

try:
    from serial import Serial, SerialException
except ImportError:
    # If pyserial is not installed, create dummy classes
    class Serial:
        def __init__(self, *args, **kwargs):
            raise ImportError("pyserial not installed")
    
    class SerialException(Exception):
        pass

load_dotenv()

class GPSService:
    """Read LAT/LON from a serial GPS device (or fallback to IP geolocation)"""

    def __init__(self):
        # Configuration
        self.GPS_PORT = os.getenv("GPS_COM_PORT", "COM7")
        self.BAUDRATE = 115200
        self.TIMEOUT = 5  # seconds to wait for GPS data
        self.GEOAPIFY_KEY = os.getenv("GEOAPIFY_API_KEY", "")
        self.available = True
        
        print(f"[GPS] Initialized")
        print(f"[GPS] Port: {self.GPS_PORT}")
        print(f"[GPS] Geoapify API Key: {'Set' if self.GEOAPIFY_KEY else 'Not Set'}")

    def _read_from_serial(self):
        """Read GPS coordinates from serial port"""
        lat, lon = None, None
        try:
            ser = Serial(self.GPS_PORT, self.BAUDRATE, timeout=1)
            start = time.time()
            
            while time.time() - start < self.TIMEOUT:
                line = ser.readline().decode('ascii', errors='replace').strip()
                
                if line.startswith("LAT:"):
                    try:
                        lat = float(line.split(":")[1].strip())
                    except ValueError:
                        pass
                        
                elif line.startswith("LONG:"):
                    try:
                        lon = float(line.split(":")[1].strip())
                    except ValueError:
                        pass
                
                if lat is not None and lon is not None:
                    break
                    
            ser.close()
            
        except SerialException as e:
            print(f"[GPS] Serial port error: {e}")
        except Exception as e:
            print(f"[GPS] Unexpected error: {e}")
            
        return lat, lon

    def get_location(self):
        """Get GPS location - try serial GPS first, fallback to IP geolocation"""
        # Try serial GPS
        lat, lon = self._read_from_serial()
        
        if lat is not None and lon is not None:
            address = self._get_address(lat, lon)
            map_image = self.get_map_image(lat, lon)
            
            result = {
                "latitude": lat,
                "longitude": lon,
                "source": "gps_device",
                "address": address,
                "timestamp": datetime.now().isoformat()
            }
            
            if map_image:
                result["map_image"] = f"data:image/png;base64,{map_image}"
                
            return result
        
        # Fallback to IP-based location
        print("[GPS] Serial GPS not available, falling back to IP geolocation")
        ip = self._get_public_ip()
        
        if ip:
            ip_location = self._get_ip_location(ip)
            if ip_location:
                lat, lon = ip_location['lat'], ip_location['lon']
                address = self._get_address(lat, lon)
                map_image = self.get_map_image(lat, lon)
                
                result = {
                    "latitude": lat,
                    "longitude": lon,
                    "source": "ip_geolocation",
                    "address": address,
                    "timestamp": datetime.now().isoformat(),
                    "ip_address": ip
                }
                
                if map_image:
                    result["map_image"] = f"data:image/png;base64,{map_image}"
                    
                return result
        
        # No location available
        return {
            "error": "GPS device not responding and IP geolocation unavailable",
            "latitude": None,
            "longitude": None,
            "source": "unavailable",
            "address": "Location not available",
            "timestamp": datetime.now().isoformat()
        }

    def _get_public_ip(self):
        """Get public IP address"""
        try:
            response = requests.get('https://api.ipify.org', timeout=5)
            response.raise_for_status()
            return response.text.strip()
        except Exception as e:
            print(f"[GPS] Failed to get public IP: {e}")
            return None

    def _get_ip_location(self, ip):
        """Get location from IP address"""
        try:
            response = requests.get(f"http://ip-api.com/json/{ip}", timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'success':
                return {
                    'lat': data.get('lat'),
                    'lon': data.get('lon'),
                    'city': data.get('city'),
                    'country': data.get('country')
                }
        except Exception as e:
            print(f"[GPS] Failed to get IP location: {e}")
            
        return None

    def get_map_image(self, lat, lon, width=200, height=200):
        """Get static map image from Geoapify"""
        if not self.GEOAPIFY_KEY:
            print("[GPS] No Geoapify API key for map image")
            return None
            
        url = (
            f"https://maps.geoapify.com/v1/staticmap"
            f"?style=osm-carto"
            f"&width={width}&height={height}"
            f"&center=lonlat:{lon},{lat}"
            f"&zoom=15"
            f"&marker=lonlat:{lon},{lat};color:%23ff0000;type:material"
            f"&apiKey={self.GEOAPIFY_KEY}"
        )
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return base64.b64encode(response.content).decode()
        except Exception as e:
            print(f"[GPS] Map image error: {e}")
            return None

    def _get_address(self, lat, lon):
        """Get address from coordinates using reverse geocoding"""
        if not self.GEOAPIFY_KEY:
            return "Address not available (no API key)"
            
        url = (
            f"https://api.geoapify.com/v1/geocode/reverse"
            f"?lat={lat}&lon={lon}"
            f"&apiKey={self.GEOAPIFY_KEY}"
        )
        
        try:
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if 'features' in data and data['features']:
                props = data['features'][0].get('properties', {})
                return props.get('formatted', "Address not found")
                
            return "Address not found"
        except Exception as e:
            print(f"[GPS] Address lookup error: {e}")
            return "Address not available"
