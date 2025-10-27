import socket
import sys

def main():
    host = "iqarhmetoagfjjyfztzq.supabase.co"
    try:
        ip = socket.gethostbyname(host)
        print(f"{host} resolves to {ip}")
    except Exception as e:
        print(f"Failed to resolve {host}: {e!r}")

if __name__ == "__main__":
    main()
